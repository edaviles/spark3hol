
# For --> Cloud Shell [ AKS ]
        
    az login --use-device-code
    az account show 
    az account set -s <your subscription name>
    az account list -o table
    az ad sp create-for-rbac -n "<Unique SP Name>" --role contributor
        
Copy the json output from the above command to a notepad.
Keep a set of your username and password ready for later for our data controller and SQL server instance. You can also choose to use the same credentials as that the admin virtual machine.

## Setup the extenstions and resource providers

    az version 
    az extension add --upgrade --yes --name connectedk8s
    az extension add --upgrade --yes --name k8s-extension
    az extension add --upgrade --yes --name customlocation
    az provider register --namespace Microsoft.ExtendedLocation --wait
    az provider register --namespace Microsoft.Web --wait
    az provider register --namespace Microsoft.KubernetesConfiguration --wait
    az extension add --upgrade --yes --name arcdata
    az extension remove --name appservice-kube
    az extension add --yes --source "https://aka.ms/appsvc/appservice_kube-latest-py2.py3-none-any.whl"

## Create your Kubernetes Cluster

    aksClusterGroupName="onpremk8s-1"
    aksName="${aksClusterGroupName}-aks"
    resourceLocation="eastus"
    
    az group create -g $aksClusterGroupName -l $resourceLocation
        
    az aks create --resource-group $aksClusterGroupName --name $aksName --node-vm-size Standard_D8s_v3 --enable-aad --generate-ssh-keys -l $resourceLocation
    
    infra_rg="$(az aks show --resource-group $aksClusterGroupName --name $aksName --output tsv --query nodeResourceGroup)"
    
## Create a puplic ip for our App services to be used later

    az network public-ip create --resource-group $infra_rg --name MyPublicIP --sku STANDARD -l $resourceLocation

    staticIp=$(az network public-ip show --resource-group $infra_rg --name MyPublicIP --output tsv --query ipAddress)

## Get the cluster credentials check connectivity

    az aks get-credentials --resource-group $aksClusterGroupName --name $aksName --admin
        
    kubectl get ns

## Create new Resource Group and onboard the cluster 

    groupName="onconnectedres-1"
    az group create -g $groupName -l $resourceLocation
    clusterName="${groupName}-cluster"
    
    az connectedk8s connect --resource-group $groupName --name $clusterName -l  $resourceLocation

    # If you need to disconnect 
    # az connectedk8s delete --name connectedres-cluster --resource-group connectedres
    # az connectedk8s show --resource-group $groupName --name $clusterName

## Create a Log Analytics workspace

    workspaceName="$groupName-workspace"

    az monitor log-analytics workspace create \
        --resource-group $groupName \
        --workspace-name $workspaceName \
        --location $resourceLocation

    az monitor log-analytics workspace get-shared-keys --resource-group $groupName --workspace-name $workspaceName

    logAnalyticsWorkspaceId=$(az monitor log-analytics workspace show --resource-group $groupName --workspace-name $workspaceName --query customerId --output tsv)
   
    wsId=$(az monitor log-analytics workspace show --resource-group $groupName --workspace-name $workspaceName --query id --output tsv)

Once the workspace is created, note the CustomerID, WorkspaceID and Workspace key in an encoded format to be used with App service extension creation. The customerID and workspaceid ("customerId": "< in the json output >"; "id": "/subscriptions/< subscription id >/resourcegroups/onconnectedres/providers/microsoft.operationalinsights/workspaces/onconnectedres-workspace")

    logAnalyticsWorkspaceIdEnc="$(printf %s $logAnalyticsWorkspaceId | base64)"
   
    logAnalyticsKey=$(az monitor log-analytics workspace get-shared-keys \
        --resource-group $groupName \
        --workspace-name $workspaceName \
        --query primarySharedKey \
        --output tsv)

    logAnalyticsKeyEncWithSpace=$(printf %s $logAnalyticsKey | base64)
    
    logAnalyticsKeyEnc=$(echo -n "${logAnalyticsKeyEncWithSpace//[[:space:]]/}")

## Create the App Service Extension and capture the extension ID

    extensionName="appservice-ext-1"
    namespace="spark3-location-1"
    kubeEnvironmentName="appsvc-kube-environment-1"
    
    az k8s-extension create \
        --resource-group $groupName \
        --name $extensionName \
        --cluster-type connectedClusters \
        --cluster-name $clusterName \
        --extension-type 'Microsoft.Web.Appservice' \
        --release-train stable \
        --auto-upgrade-minor-version true \
        --scope cluster \
        --release-namespace $namespace \
        --configuration-settings "Microsoft.CustomLocation.ServiceAccount=default" \
        --configuration-settings "appsNamespace=${namespace}" \
        --configuration-settings "clusterName=${kubeEnvironmentName}" \
        --configuration-settings "loadBalancerIp=${staticIp}" \
        --configuration-settings "keda.enabled=true" \
        --configuration-settings "buildService.storageClassName=default" \
        --configuration-settings "buildService.storageAccessMode=ReadWriteOnce" \
        --configuration-settings "customConfigMap=${namespace}/kube-environment-config" \
        --configuration-settings "envoy.annotations.service.beta.kubernetes.io/azure-load-balancer-resource-group=${aksClusterGroupName}" \
        --configuration-settings "logProcessor.appLogs.destination=log-analytics" \
        --configuration-protected-settings "logProcessor.appLogs.logAnalyticsConfig.customerId=${logAnalyticsWorkspaceIdEnc}" \
        --configuration-protected-settings "logProcessor.appLogs.logAnalyticsConfig.sharedKey=${logAnalyticsKeyEnc}"


    kubectl get svc,pods,deployments -n $namespace 
    
    extensionId=$(az k8s-extension show \
        --cluster-type connectedClusters \
        --cluster-name $clusterName \
        --resource-group $groupName \
        --name $extensionName \
        --query id \
        --output tsv)

    az resource wait --ids $extensionId --custom "properties.installState!='Pending'" --api-version "2020-07-01-preview"

    kubectl get pods -n $namespace

## Create a Custom location and map it to the cluster and the extension. **You can also create a custom location using the Azure portal**

    customLocationName=$namespace
    
    connectedClusterId=$(az connectedk8s show --resource-group $groupName --name $clusterName --query id --output tsv)
    
    az customlocation create \
        --resource-group $groupName \
        --location $resourceLocation \
        --name $customLocationName \
        --host-resource-id $connectedClusterId \
        --namespace $namespace \
        --cluster-extension-ids $extensionId

**Browse the custom location resource using the Azure portal and note the Arc-enabled services.**

    az customlocation show --resource-group $groupName --name $customLocationName 
   
    customLocationId=$(az customlocation show \
    --resource-group $groupName \
    --name $customLocationName \
    --query id \
    --output tsv)

## Create the Azure Defender and Azure Monitor Extensions.

More details here: https://docs.microsoft.com/en-us/azure/security-center/defender-for-kubernetes-azure-arc 

    az k8s-extension create --name "azuremonitor-containers" \
    --cluster-name $clusterName \
    --resource-group $groupName \
    --cluster-type connectedClusters \
    --extension-type Microsoft.AzureMonitor.Containers \
    --configuration-settings logAnalyticsWorkspaceResourceID=$wsId

    # Ensure you have Azure Defender Plan turned on in Azure Security Center before you create the Defender extension

    az k8s-extension create --name "azure-defender" \
    --cluster-name $clusterName \
    --resource-group $groupName \
    --cluster-type connectedClusters \
    --extension-type Microsoft.AzureDefender.Kubernetes \
    --configuration-settings logAnalyticsWorkspaceResourceID=$wsId

    # Test create an alert by creating a new pod. This usually takes upto 30 min to show up in the Security Center.
    
    kubectl get pods --namespace=asc-alerttest-662jfi039n

    // --- DO NOT USE TILL HERE 

## Deploy the App service Kubernetes Environment

    az appservice kube create \
    --resource-group $groupName \
    --location $resourceLocation \
    --name $kubeEnvironmentName \
    --custom-location $customLocationId \
    --static-ip $staticIp

    az appservice kube show \
    --resource-group $groupName \
    --name $kubeEnvironmentName

    kubectl get pods -n $namespace

## Deploy two webApps and App Service Plan

You can use the portal instead of the command lines. The new portal experience is better. It also creates a default App Services Plan along with the WebApp.

    appPlanName=Appplan-$RANDOM
    webAppName=WebApp-$appPlanName

    az appservice plan create -g $groupName -n $appPlanName \
    --custom-location $customLocationId \
    --per-site-scaling --is-linux --sku K1

    kubectl get pods -n $namespace

**Create two Web Applications. .Net Core and Nodejs.**

    az webapp create --resource-group $groupName --plan $appPlanName --name $webAppName --runtime "DOTNETCORE|3.1"
    
    az webapp create \
    --plan $appPlanName \
    --resource-group $groupName \
    --name sampleApp \
    --custom-location $customLocationId \
    --runtime 'NODE|12-lts'

> Deploy a sample Nodejs 'Hello world' app using https://github.com/Azure-Samples/nodejs-docs-hello-world

    kubectl get pods -n $namespace

> Deploy an ASP.Net appliction using Azure App Service 'Deployment Center' to todo app

- Fork the repo to your github account https://github.com/azure-samples/dotnetcore-sqldb-tutorial

- Copy the name of your repo for "dotnetcore-sqldb-tutorial' app

- Use this URI and Github Actions to deploy the applicaiton to your .Net core web App via 'Deployment Center'

- Create a Application Setting with name 'MyDbConnection' and set to "Data Source=tcp:<SQL MI Public IP>,<port>;Initial Catalog=<dbname>;User Id=<username>;Password=<super secret password>;"

You can create it manually or using the below command. **We will create it using the portal**

    az webapp config connection-string set --resource-group $groupName --name $webAppName --settings MyDbConnection="  
    Data Source=tcp:<SQL MI Public IP>,<port>;Initial Catalog=<dbname>;User Id=<username>;Password=<password>;" --connection-string-type SQLAzure

   --------------------------------------------------------------------------

## Create the Data Services Extension

    az k8s-extension create --name arc-data-services --extension-type microsoft.arcdataservices --cluster-type connectedClusters --cluster-name $clusterName --resource-group $groupName --auto-upgrade false --scope cluster --release-namespace $namespace --config Microsoft.CustomLocation.ServiceAccount=sa-bootstrapper
    
    kubectl get pods -n $namespace

## Update Custom location

This is to include data services extension with our custom location. You can either use the portal to update the location with the extension services or use the CLI below. **LETS USE THE PORTAL EXPERIENCE.** The below commands are yet to be tested fully.

    # extensionId=$(az k8s-extension show --name arc-data-services --cluster-type connectedClusters --cluster-name $clusterName --resource-group $groupName --query id -o tsv)
    # connectedClusterId=$(az connectedk8s show --name $clusterName --resource-group $groupName --query id -o tsv)
    # az customlocation list-enabled-resource-types --name $namespace --resource-group $groupName
    # az customlocation update --cluster-extension-ids $extensionId --host-resource-id $connectedClusterId --name $customLocationName --namespace $namespace --resource-group           $groupName --location $resourceLocation

- Make sure you visit the Arc-enabled services for custom location using the portal or cli to ensure both data and app services are listed.

## Deploy a Data Controller

- Deploy a Data controller using azure portal; Choose 'azure-arc-aks-premium-storage' template and chnage the storage class to 'managed-premium'
- Deploy a SQLMI instance using azure portal and endpoint as 'LoadBalancer'

        kubectl get pods -n $namespace
        # Wait for the pods to come up

        kubectl get datacontrollers -n $namespace

## Connect to the SQL MI instance and Create a DB

    IF NOT EXISTS (
    SELECT name
    FROM sys.databases
    WHERE name = N'tododb'
    )
    CREATE DATABASE [tododb]
    GO

    SET ANSI_NULLS ON
    GO

    SET QUOTED_IDENTIFIER ON
    GO

    CREATE TABLE [tododb].[dbo].[Todo](
        [ID] [int] IDENTITY(1,1) NOT NULL,
        [Description] [nvarchar](max) NULL,
        [CreatedDate] [datetime2](7) NOT NULL
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
    GO

## Check your todo application; you should be able to access and insert update values

Congratulations! you have now successfully deployed a cloud native .net core application using App service anywhere and an always updated SQL MI instance to an on-premises kubernetes cluster (AKS in this case though). Your target location can be anywhere of your choice: any other cloud, on-prem or at the edge.

    NOTE: This repo is under construction and will be having a more updated complete version in near future with more scenarios to test and work with.

Quick listdown of variables for reference:

    aksClusterGroupName="onpremk8s-1"
    aksName="${aksClusterGroupName}-aks"
    resourceLocation="eastus"
    groupName="onconnectedres-1"
    workspaceName="$groupName-workspace"
    extensionName="appservice-ext-1"
    customLocationName=$namespace
    namespace="spark3-location-1"
    kubeEnvironmentName="appsvc-kube-environment-1"
    appPlanName=Appplan-$RANDOM
    webAppName=WebApp-$appPlanName
