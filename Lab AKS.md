# Overview:
The objective of this HOL is to understand, learn and experience how to deploy a cloud native application to any supported kubernetes running either on-premises, any other cloud provider locaiton or at the edge. The application here is deployed using Azure App service and Azure SQL Server managed instance. 

For the purpose of this part of the HOL you will be deploying a base AKS cluster that will represent any of the locations as mentioned above. We are using AKS here to simplify deployment and to leverage the cloud  load balancer instead of creating everything from scratch at this time. You can however, use any existing supported kubernetes supported by CNCF and Azure Arc. Cloud native anywhere with Azure Arc enables you to deploy Azure cloud native services and brings the intelligent cloud services to any infrastructure.

A sample representation of this deployment will be something similar to this image below:

![buildpic1.jpg](https://github.com/Bapic/spark3hol/blob/main/Images/buildpic1.jpg)

# Pre-requisites:
<li> Azure Subscription
<li> Github account
<li> Azure CLI, HELM v3, Kubectl tool
<li> SSH keys (not required for this scenario, but will be handy when you use CAPI based cluster as mentioned in the CAPI based cluster lab)
<li> One Azure Service Principal as Contributor
<li> Az Data CLI
<li> Azure Data Studio
<li> SQL MI and PostgreSQL extensions

If you already have a system already installed with these tools. Great!  


# Setting up the prerequisites:
1. Azure Subscription- If you do not have one. get one here for free.
2. Github Account- Create one if you don't have one and fork this repo.
3. Azure CLI, HELM v3, Kubectl tool- we will use the Azure Cloud Shell
4. SSH keys- login to Azure Cloud shell and run the below command.
The following ssh-keygen command generates 4096-bit SSH RSA public and private key files by default in the ~/.ssh directory. If an SSH key pair exists in the current location, those files are overwritten.
    
        ssh-keygen -m PEM -t rsa -b 4096
        # not required for this scenario

5. Azure Service principal- login to Azure Cloud shell and run.
        
        az login --use-device-code
        #Ensure you are in the correct subscription
        
        az account show 

If not set the correct subscription
        
        az account set -s <your subscription name>
        
        az account list -o table
        
        az ad sp create-for-rbac -n "<Unique SP Name>" --role contributor
        
        # copy the json output from the above command to a notepad.
        # Keep a set of your username and password ready for later

# Let's get started
There are series of activities that we will perform. Here is a simple representation. Please note that due to the continuos change of the platform and how we deploy these services, the flow image is subject to change and is not always a very updated one.

![activitymilestone1.jpg](https://github.com/Bapic/spark3hol/blob/main/Images/activitymilestone1.jpg)

## setup the extenstions and resource providers

    az version 
    # Ensure you are in 2.25.0 and not 2.26.0; there appears to be some known issues at this time that doesnt work well for what we are trying to do today.
        
    az extension add --upgrade --yes --name connectedk8s
        
    az extension add --upgrade --yes --name k8s-extension

    az extension add --upgrade --yes --name customlocation

    az provider register --namespace Microsoft.ExtendedLocation --wait

    az provider register --namespace Microsoft.Web --wait

    az provider register --namespace Microsoft.KubernetesConfiguration --wait

    az extension add --upgrade --yes --name arcdata
        
    az extension add --upgrade --yes --name azdata

    az extension remove --name appservice-kube

    az extension add --yes --source "https://aka.ms/appsvc/appservice_kube-latest-py2.py3-none-any.whl"

## Create your Kubernetes Cluster

    aksClusterGroupName="onpremk8s"
    # Name of resource group for the AKS cluster

    aksName="${aksClusterGroupName}-aks" 
    # Name of the AKS cluster

    resourceLocation="eastus"
    # "eastus" or "westeurope" This step is very critical since these are the currently only supported regions. 

    az group create -g $aksClusterGroupName -l $resourceLocation
        
    az aks create --resource-group $aksClusterGroupName --name $aksName --enable-aad --generate-ssh-keys -l $resourceLocation

    infra_rg=$(az aks show --resource-group $aksClusterGroupName --name $aksName --output tsv --query nodeResourceGroup)

## Create a puplic ip for our App services to be used later

    az network public-ip create --resource-group $infra_rg --name MyPublicIP --sku STANDARD -l $resourceLocation

    staticIp=$(az network public-ip show --resource-group $infra_rg --name MyPublicIP --output tsv --query ipAddress)

## Get the cluster credentials check connectivity

    az aks get-credentials --resource-group $aksClusterGroupName --name $aksName --admin
        
    kubectl get ns

## Create new Resource Group and onboard the cluster as a Azure Arc enabled kubernetes cluster, also known as Connected Cluster

    groupName="onconnectedres" 
    # Name of resource group for the connected cluster

    az group create -g $groupName -l $resourceLocation

    clusterName="${groupName}-cluster" 
    # Name of the connected cluster resource

    az connectedk8s connect --resource-group $groupName --name $clusterName -l  $resourceLocation

    # If you need to disconnect 
    # az connectedk8s delete --name connectedres-cluster --resource-group connectedres

    az connectedk8s show --resource-group $groupName --name $clusterName

## Create a Log Analytics workspace 

    # Once the workspace is created note the workspaceID and workspace key in an encoded format to be used with App service extension creation 

    workspaceName="$groupName-workspace" 
    # Name of the Log Analytics workspace

    az monitor log-analytics workspace create \
        --resource-group $groupName \
        --workspace-name $workspaceName \
        --location $resourceLocation

    az monitor log-analytics workspace get-shared-keys --resource-group $groupName --workspace-name $workspaceName

Copy the output - at least customerID and workspaceid ("customerId": "< in the json output >", "id": "/subscriptions/< subscription id >/resourcegroups/onconnectedres/providers/microsoft.operationalinsights/workspaces/onconnectedres-workspace")

    logAnalyticsWorkspaceId=$(az monitor log-analytics workspace show \
        --resource-group $groupName \
        --workspace-name $workspaceName \
        --query customerId \
        --output tsv)

    logAnalyticsWorkspaceIdEnc=$(printf %s $logAnalyticsWorkspaceId | base64) 
    # Needed for the next step

    logAnalyticsKey=$(az monitor log-analytics workspace get-shared-keys \
        --resource-group $groupName \
        --workspace-name $workspaceName \
        --query primarySharedKey \
        --output tsv)

    logAnalyticsKeyEncWithSpace=$(printf %s $logAnalyticsKey | base64)

    logAnalyticsKeyEnc=$(echo -n "${logAnalyticsKeyEncWithSpace//[[:space:]]/}") 
    # Needed for the next step

## Create the App Service Extension and capture the extension ID

    extensionName="appservice-ext" 
    # Name of the App Service extension
        
    namespace="spark3-location" 
     # Namespace in your cluster to install the extension and provision resources

    kubeEnvironmentName="appsvc-kube-environment" 
    # Name of the App Service Kubernetes environment resource, add your empid to make it unique


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
        # Observe the various pods and services being created such as log processor, build service and image cache.

    extensionId=$(az k8s-extension show \
        --cluster-type connectedClusters \
        --cluster-name $clusterName \
        --resource-group $groupName \
        --name $extensionName \
        --query id \
        --output tsv)

    az resource wait --ids $extensionId --custom "properties.installState!='Pending'" --api-version "2020-07-01-preview"

    kubectl get pods -n $namespace

## Create a Custom location and map it to the cluster and the extension

    customLocationName=$namespace 
    # Name of the custom location

    connectedClusterId=$(az connectedk8s show --resource-group $groupName --name $clusterName --query id --output tsv)
    
    az customlocation create \
        --resource-group $groupName \
        --location $resourceLocation \
        --name $customLocationName \
        --host-resource-id $connectedClusterId \
        --namespace $namespace \
        --cluster-extension-ids $extensionId

Browse the custom location resource using the Azure portal and note the Arc-enabled services

    az customlocation show \
    --resource-group $groupName \
    --name $customLocationName

    customLocationId=$(az customlocation show \
    --resource-group $groupName \
    --name $customLocationName \
    --query id \
    --output tsv)


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

## Deploy an App service Plan

    appPlanName=Appplan-$RANDOM
    webAppName=WebApp-$appPlanName

    az appservice plan create -g $groupName -n $appPlanName \
    --custom-location $customLocationId \
    --per-site-scaling --is-linux --sku K1

    kubectl get pods -n $namespace

## Create two WebApps 

    az webapp create --resource-group $groupName --plan $appPlanName --name $webAppName --runtime "DOTNETCORE|3.1"
    
    # You now should now be able to browse the webApp home page following the webApp URL. Now create another WebApp with Node runtime.

    az webapp create \
    --plan $appPlanName \
    --resource-group $groupName \
    --name sampleApp \
    --custom-location $customLocationId \
    --runtime 'NODE|12-lts'

## Deploy a sample Nodejs 'Hello world' app to test

    git clone https://github.com/Azure-Samples/nodejs-docs-hello-world

    cd nodejs-docs-hello-world

    zip -r package.zip .
    
    az webapp deployment source config-zip --resource-group $groupName --name sampleApp --src package.zip

    kubectl get pods -n $namespace

## Deploy an ASP.Net appliction using Azure App Service 'Deployment Center' to todo app 
- Use https://github.com/azure-samples/dotnetcore-sqldb-tutorial
- Create a Application Setting with name 'MyDbConnection' and set to "Data Source=tcp:<SQL MI Public IP>,<port>;Initial Catalog=<dbname>;User Id=<username>;Password=<super secret password>;"

You can create it manually or using the below command.

    az webapp config connection-string set --resource-group $groupName --name $webAppName --settings MyDbConnection="  
    Data Source=tcp:<SQL MI Public IP>,<port>;Initial Catalog=<dbname>;User Id=<username>;Password=<password>;" --connection-string-type SQLAzure

## Create the Data Services Extension

    az k8s-extension create --name arc-data-services --extension-type microsoft.arcdataservices --cluster-type connectedClusters --cluster-name $clusterName --resource-group $groupName --auto-upgrade false --scope cluster --release-namespace $namespace --config Microsoft.CustomLocation.ServiceAccount=sa-bootstrapper
    
    kubectl get pods -n $namespace

    extensionId=$(az k8s-extension show --name arc-data-services --cluster-type connectedClusters --cluster-name $clusterName --resource-group $groupName --query id -o tsv)

## Update Custom location 

This is to include data services extension with our custom location. You can either use the portal to update the location with the extension services or use the CLI below. LETS USE THE PORTAL EXPERIENCE.

    connectedClusterId=$(az connectedk8s show --name $clusterName --resource-group $groupName --query id -o tsv)

    az customlocation list-enabled-resource-types --name $namespace --resource-group $groupName

    az customlocation update --cluster-extension-ids $extensionId --host-resource-id $connectedClusterId --name $customLocationName --namespace $namespace --resource-group $groupName --location $resourceLocation

Make sure you visit the Arc-enabled services for custom location using the portal or cli to ensure both data and app services are listed.


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

    ALTER TABLE [dbo].[Todo] ADD  CONSTRAINT [PK_Todo] PRIMARY KEY CLUSTERED 
    (
        [ID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    GO

## Check your todo application; you should be able to access and insert update values


Congratulations! you have now successfully deployed a cloud native .net core application using App service and always updated SQL MI instance to a kubernetes cluster. This cluster can be hosted in any location: any other cloud, on-prem or at the edge.
