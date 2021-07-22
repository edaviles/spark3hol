# Deploy Cloud Native Apps - AKS Cluster (WIP)

## Introduction

The purpose of this document is to guide users to *Deploy* various *Cloud Native Applications* onto a <u>*Managed K8s cluster* viz. AKS</u>. The Managed cluster can be any standard K8s cluster but the document uses from any Cloud Provider and approved by CNCF. 

Managed clusters come up with some basic to advanced tools and methodologies which makes deploying Cloud Native applications extremely and seamless providing rwady access to Infrtastructure services like Network, Laod Balancers, Storage Classes, RBAC etc. Choosing AKS makes it easy to integrate iwth Azure Services and hence it is being used for this exercise!

Now for deploying Cloud Native Applications on to AKS - we would use *Azure Arc for Kubernetes* as the service. This would help us to still work with our applications as-is on Cloud *(App Services, Functions, Logic Apps, Message Brokers like EventGrid* etc.) yet you can run it anywhere - be it on a *Managed Cluster like AKS* or an *Un-managed cluster like this one* Or *K8s clusters on any other Cloud* Or even *K8s bare metal clusters*

### What the Document does

- Deep dive on Azure Arc for K8s
- Create an AKS cluster using Azure CLI
- Installs all Providers and Extensions needed by Azure Arc for K8s
- Creates and Deploys a sample Web App in NodeJs onto the AKS cluster
- Creates and Deploys a sample Function App in .NetCore onto the AKS cluster
- Creates and Deploys a sample Logic App workflow onto the AKS cluster
- Create an EventGerid Topic on Azure and Subscribes for any of the above services e.g. *Function App Endpoint*.
  - Deploys any sample application onto AKS cluster - e.g. *Nginx server*
  - Get inside the application Pod and executes CURL command to post a message onto the EventGrid endpoint
  - Check that the corresponding Subscription Endpoint (e.g. *Function App*) is fired!

### What the Document does NOT

- Go thru the details of AKS cluster creation
- Deep dive on K8s or AKS
- Deep dive on overall Azure Arc

![agent-connect](./Assets/agent-connect.png)

### Repository Structure

#### Deployments

- Parent Folder

- ##### Helms

  - Contains helm charts for any deployment that user may want to do on the AKS cluster
  - For this exercise, only persistent volume is needed - **pv-chart**
    - **values-eg.yaml** - This is to deploy PersistentVolume for EventGrid - this would be explained later
    - **values-fs.yaml** - This is to deploy PersistentVolume for App Services - this would be explained later

- ##### Setup

  - All files that would be used during creation of AKS cluster
  
  - ....
  
    

### Pre-requisites, Assumptions

- Knowledge on Containers, Serverless Functions, Logic App - *L200+*
- Knowledge on K8s  - *L200+*
- Knoweldge on VSCode; Deploying applications throigh VSCode - L200+
- Some knowledge on Azure tools & services viz. *Azure CLI, KeyVault, VNET* etc. would help



### Plan

- #### Create Jump Server resources

  - **master-workshop-rg**

    - **Virtual Network and Subnets** - Hosting *Jump Server*

    - **Jump Server VM**

      - Run through all commands to Create and Connect to the cluster

      - Run through all commands to configuere Cluster for Azure Arc

      - Run through all commands to deploy applications onto the Cluster

        

- #### Seggregate the workload into 3 Resource Groups as per the usage

  - **aks-workshop-rg**

    - Contains all Infrastructure components and services of the AKS cluster
      - **Worker Node VMs** - 3 VMs to host app workloads
      - **Virtual Network and Subnets** - Hosting K8s cluster Nodes - *Master, Worker* and *Jump Server*

  - **arc-k8s-rg**

    - Contains Azure Arc components for K8s

      - ##### **Arc Connected Cluster** for the AKS cluster.

        - Establishes a connectivity to API Server running on K8s Control Plane 9Master Node) and ensures Arc is managing the k8s cluter on Azure

      - ##### **CustomLocation**

        - Acts as the Target location for deploying application and Data service instances on the k8s cluster. 
        - Each cluster would need one or more Custom Locations
        - Each **CustomLocation** can host multiple app and data instances
        - To be explained later in details

      - ##### App Service Kubernetes environment

        - Enables configuration common to apps in the custom location
        
        - This is required before any apps are deployed onto the cluster
        
          

  - **arc-services-rg**

    - Contains all microservices to be deployed onto K8s Cluster
      - **HelloJSApp**
      - **PostMessage** Function App
      - **Workflow** Logic App
      - **NotifyTopic** Event Grid Topic
      
      

### Action - Step-By-Step

#### Management Resources

- **Create** Management Resource Group

  ```bash
  az group create -l eastus -n master-workshop-rg
  ```

-  **Create** VNet and SubNet for Jump Server VM

- **Create** a Jump Server VM - preferred is Windows VM so that all visualisation tools like **Lens** etc. can be used to view the cluster status at runtime. The one used for this workshop was - 

   - OS - **Windows Server 2019 DC - v1809**
   - Size  - **Standard DS2 v2 (2 vcpus, 7 GiB memory)**

4. **RDP** to the *Windows VM*

5. **Install** following tools for creation and management of the cluster and its associated resources

   1. **Chocolatey**

      ```bash
      # Follow this link and install Chocolatey latest
      https://chocolatey.org/install
      ```

   2. **Azure CLI**

      ```bash
      # Follow this link and install Azure CLI latest
      https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows?tabs=azure-cli
      ```

   3. **Kubectl**

      ```bash
      choco install kubernetes-cli
      
      # Otherwise, follow the various options at -
      https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/ 
      ```

   4. **Helm**

      ```
      choco install kubernetes-helm
      ```

   5. **PowerShell Core**

      ```bash
      # Follow this link and install PowerShell Core for Windows
      https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-windows?view=powershell-7.1
      
      # Install Az module for communicating to Azure over Az cmdlet
      Install-Module -Name Az -AllowClobber
      ```

   6. **Lens** - *For monitoring Cluster resources*

      ```bash
      # Follow this link and install Lens for Windows
      https://k8slens.dev/
      ```

   7. (Optional) **Visual Studio Code**

      ```bash
      # Follow this link and install Visual Studio Code
      # This is for better management of scripts and commands
      https://code.visualstudio.com/docs/setup/windows
      ```

   8. (*Optional*) **Docker**

      ```bash
      # Follow this link and install Docker Desktop latest for Windows
      https://docs.docker.com/docker-for-windows/install/
      
      # Install this only if you want to play with Docker images locally
      # This workshop will use a different techniqe so installation of Docker is not needed
      ```

6. The **Jump Server** is now ready to be used for subsequent deployments



#### Working Resources

## <u>Architecture Diagram - AKS - TBD</u>

## <u>Architecture Diagram - ARC Agent - TBD</u>

1. **Set CLI** variables for easy usage and reference

   ```bash
   tenantId="<tenantID"
   subscriptionId="<subscriptionId>"
   arcResourceGroup="arc-workshop-rg"
   aksResourceGroup="arc-aks-rg"
   arcServicesResourceGroup="arc-services-rg"
   location="eastus"
   clusterName="arc-aks-cluster"
   version=1.18.19
   aksVnetName=arc-aks-vnet
   aksVnetPrefix=17.0.0.0/23
   aksVnetId=
   aksSubnetName=arc-aks-subnet
   aksSubnetPrefix=17.0.0.0/24
   aksSubnetId=
   sysNodeSize="Standard_DS3_v2"
   sysNodeCount=3
   maxSysPods=30
   networkPlugin=azure
   networkPolicy=azure
   sysNodePoolName=arcsyspool
   vmSetType=VirtualMachineScaleSets
   addons=monitoring
   aadAdminGroupID="<aadAdminGroupID>"
   aadTenantID="<aadTenantID>"
   extensionName="$clusterName-ext-appsvc"
   extensionNamespace="$clusterName-appsvc-ns"
   kubeEnvironmentName="$clusterName-appsvc-kube"
   customLocationName="$clusterName-custom-location"
   connectedClusterName="arc-workshop-aks"
   spAppId="<appId>"
   spPassword="<password>"
   ```

2. **Login** to Azure

   ```bash
   az login --tenant $tenantId
   ```

3. **Create** *Resource Groups* as described in the **Plan** section

   ```bash
   az group create -l eastus -n $aksResourceGroup
   az group create -l eastus -n $arcK8sResourceGroup
   az group create -l eastus -n $arcSvcResourceGroup
   
   ```

4. **Create** Service Principal for AKS cluster

   - **k8s-aks-sp** - Name of the service principal

     ```bash
     # Create service principal - k8s-aks-sp
     az ad sp create-for-rbac --skip-assignment --name http://k8s-aks-sp
     
     # Service Principal details
     {
       "appId": "<appId>",
       "displayName": "k8s-aks-sp",
       "name": "http://k8s-aks-sp",
       "password": "<password>",
       "tenant": "<tenantId>"
     }
     ```

5. **Create** VNET which hosts AKS Subnet

   ```bash
   az network vnet create -n $aksVnetName -g $aksResourceGroup --address-prefixes $aksVnetPrefix
   aksVnetId=$(az network vnet show -n $aksVnetName -g $aksResourceGroup --query="id" -o tsv)
   echo $aksVnetId
   ```

6. **Create** Subnet which hosts AKS Cluster

   ```bash
   az network vnet subnet create -n $aksSubnetName --vnet-name $aksVnetName -g $aksResourceGroup --address-prefixes $aksSubnetPrefix
   aksSubnetId=$(az network vnet subnet show -n $aksSubnetName --vnet-name $aksVnetName -g $aksResourceGroup --query="id" -o tsv)
   echo $aksSubnetId
   ```

7. **Assign** *Role* for Service Principal

   ```bash
   # Create Role assignment - Network Contrubutor
   az role assignment create --assignee $spAppId --role "Network Contributor" --scope $aksVnetId
   
   # Create Role assignment - Contrubutor
   az role assignment create --role=Contributor --assignee=$AZURE_CLIENT_ID --scope=/subscriptions/$AZURE_SUBSCRIPTION_ID
   
   arcResourceGroupId=$(az group show -n $arcResourceGroup --query="id" -o tsv)
   az role assignment create --assignee $spAppId --role "Monitoring Metrics Publisher" --scope $arcResourceGroupId
   ```

8. **Deploy** *Workload Cluster*

   ```bash
   az aks create --name $clusterName \
   --resource-group $aksResourceGroup \
   --kubernetes-version $version --location $location \
   --vnet-subnet-id "$aksSubnetId" --enable-addons $addons \
   --node-vm-size $sysNodeSize \
   --node-count $sysNodeCount --max-pods $maxSysPods \
   --service-principal $spAppId \
   --client-secret $spPassword \
   --network-plugin $networkPlugin --network-policy $networkPolicy \
   --nodepool-name $sysNodePoolName --vm-set-type $vmSetType \
   --generate-ssh-keys \
   --enable-aad \
   --aad-admin-group-object-ids $aadAdminGroupID \
   --aad-tenant-id $aadTenantID
   ```

9. Get **kubeconfig** for newly created AKS cluster

   ```bash
   clusterctl get kubeconfig $clusterName > aks-k8s-cluster.kubeconfig
   alias kubectl="k --kubeconfig=$baseFolderPath/Setup/aks-k8s-cluster.kubeconfig"
   alias helm-aks="helm --kubeconfig=$baseFolderPath/Setup/aks-k8s-cluster.kubeconfig"
   ```

10. **Set** *Azure Arc Extension* variables

    ```bash
    connectedClusterName="arc-aks-k8s"
    customLocationName="$clusterName-custom-location"
    appsvcExtensionName="$clusterName-ext-appsvc"
    appsvcExtensionNamespace="$clusterName-appsvc-ns"
    appsvcKubeEnvironmentName="$clusterName-appsvc-kube"
    ```

11. Add **connectedk8s** extension to Azure CLI

    ```bash
    az extension add --upgrade --yes --name connectedk8s
    az extension add --upgrade --yes --name k8s-extension
    az extension add --upgrade --yes --name customlocation
    
    az extension remove --name appservice-kube
    az extension add --yes --source "https://aka.ms/appsvc/appservice_kube-latest-py2.py3-none-any.whl"
    az extension show  -n appservice-kube -o table
    ```

12. **Register** *Providers* as required by *Azure Arc for K8s*

    ```bash
    # Register required Providers
    az provider register --namespace Microsoft.Kubernetes
    az provider register --namespace Microsoft.KubernetesConfiguration
    az provider register --namespace Microsoft.ExtendedLocation
    az provider register --namespace Microsoft.Web
    
    # Check Registration status of required Providers
    az provider show -n Microsoft.Kubernetes -o table
    az provider show -n Microsoft.KubernetesConfiguration -o table
    az provider show -n Microsoft.ExtendedLocation -o table
    az provider show -n Microsoft.Web -o table
    ```

13. **Connect** AKS cluster with Azure Arc

    ```bash
    # Get K8s cluster contexts
    kubectl config get-contexts
    
    # Connect K8s cluster with Azure Arc
    az connectedk8s connect -g $arcResourceGroupName -n $connectedClusterName \
    --kube-config $baseFolderPath/Setup/aks-k8s-cluster.kubeconfig \
    --kube-context aks-k8s-cluster-admin@capz-k8s-cluster
    ```

14. **Check** successful connectivity with Azure Arc

    ```bash
    # List Connected clusters
    az connectedk8s list --resource-group $arcResourceGroupName --output table
    
    # Check Deployments, Pods for the Arc connected cluster
    kubectl get deployments,pods -n azure-arc
    ```

15. **Create** a Public IP

    - Used by App Service Extension to create ELB service on AKS cluster

    - The Public Service is used by Application Services on Azure to communicate with the corrsponding Pods in the cluster

      ```bash
      # Create Public IP
      az network public-ip create -g $aksResourceGroup -n $clusterName-ext-appsvc-pip --sku STANDARD
      
      # Static Public IP
      staticIp=$(az network public-ip show -g $aksResourceGroup -n $clusterName-ext-appsvc-pip --output tsv --query ipAddress)
      ```

16. **Deploy** *App Service* Extension on the AKS cluster

    ```bash
    az k8s-extension create \
    --resource-group $arcResourceGroupName \
    --name $appsvcExtensionName \
    --cluster-type connectedClusters \
    --cluster-name $connectedClusterName \
    --extension-type 'Microsoft.Web.Appservice' \
    --release-train stable \
    --auto-upgrade-minor-version true \
    --scope cluster \
    --release-namespace $appsvcExtensionNamespace \
    --configuration-settings "Microsoft.CustomLocation.ServiceAccount=default" \
    --configuration-settings "appsNamespace=${appsvcExtensionNamespace}" \
    --configuration-settings "clusterName=${appsvcKubeEnvironmentName}" \
    --configuration-settings "loadBalancerIp=${staticIp}" \
    --configuration-settings "keda.enabled=true" \
    --configuration-settings "buildService.storageClassName=default" \
    --configuration-settings "buildService.storageAccessMode=ReadWriteOnce" \
    --configuration-settings "customConfigMap=${appsvcExtensionNamespace}/kube-environment-config" \
    --configuration-settings "envoy.annotations.service.beta.kubernetes.io/azure-load-balancer-resource-group=${aksResourceGroup}"
    ```

17. **Check** the status of the *App Service* Extension creation

    ```bash
    az k8s-extension show -c $connectedClusterName --cluster-type connectedClusters   -n $appsvcExtensionName -g $arcResourceGroupName
    ```

    ## <u>Architecture Diagram - AKS - App SVC Extension - TBD</u>

18. **Retrieve** the *ExtensionId* to be used in subsequent steps

    ```bash
    extensionId=$(az k8s-extension show \
      --cluster-type connectedClusters \
      --cluster-name $connectedClusterName \
      --resource-group $arcResourceGroupName \
      --name $appsvcExtensionName \
      --query id \
      --output tsv)
    echo $extensionId
    
    # Check Pods created in teh extensionNamespace
    kubectl get po -n $appsvcExtensionNamespace
    ```

19. **Create** *CustomLocation* with Azure Arc Connected Cluster

    - Every *Application Services* or *Data Services* would be deployed in the *CustomLocation* rather than an Azure Region/Location

    - This would ensure various types of application and data services can run together in same Arc Enabled Cluster

      ```bash
      connectedClusterId=$(az connectedk8s show --resource-group $arcResourceGroupName --name $connectedClusterName --query id --output tsv)
      echo $connectedClusterId
      
      az customlocation create \
      --resource-group $arcResourceGroupName \
      --name $customLocationName \
      --host-resource-id $connectedClusterId \
      --namespace $appsvcExtensionNamespace \
      --cluster-extension-ids $extensionId
      ```

      ## <u>Architecture Diagram - AKS - Custom Location - TBD</u>

20. **Check** the status of CustomLocation creation process

    ```bash
    az customlocation show --resource-group $arcResourceGroupName --name $customLocationName
    ```

21. **Retrieve** the *CustomLocationId* to be used in subsequent steps

    ```bash
    customLocationId=$(az customlocation show \
    --resource-group $arcResourceGroupName \
    --name $customLocationName \
    --query id \
    --output tsv)
    echo $customLocationId 
    ```

22. **Create** *App Service Kube Environment* for the above *CustomLocation*

    - This is a collection of all *App Service Plans* and *App Services*

    - Please note that this is only needed for Application Services; for Data Services thsi would be performed by Data Controllers for Arc

      ```bash
      az appservice kube create \
      --resource-group $arcResourceGroupName \
      --name $appsvcKubeEnvironmentName \
      --custom-location $customLocationId \
      --static-ip $staticIp
      ```

23. Check Kueb Environment creation process

    ```bash
    az appservice kube show \
    --resource-group $arcResourceGroupName \
    --name $appsvcKubeEnvironmentName
    ```

24. Let us now delve into creating Application Services onto Azure and then deploying onto AKS cluster



## <u>Architecture Diagram - AKS - AppFlow - TBD</u>



#### App Services

- This execise uses a simple API App in NodeJS - **HelloJSApp** for this purpose. One can use any App Service or Web API for this purpose
- Visual Studio Code or Visual Studio both have easy integration with Azure Resource management. Any other IDE with appropriate plugins can be used as well. This exercise would use VSCode as an option
- Open App Service root folder in Visual Studio Code
- Right Click and **Deploy** to API App. Please note one can create the Web App/API App in the portal and then manage deployment from VSCode
- VSCode would ask for a new App to be Created Or Deploy on an existing one
- The Target Location step is extremely important - ***should be the <u>CustomLocation</u> created in earlier steps***
- Once the steps are completed, comeback to Azure CLI
- Check *Deployments* and/or *Pods* of the App Service Namespace in the K8s cluster. All Pods should be in the running state
- Go to Azure Portal and Check the App Service resource; in the Overview blade it will show up the Web API access URL
- Check the URL in te browser; use Postman or any REST client to call to test different paths of the API App

#### Function App

- This execise uses a simple *Http Triggerred* Azure Function in .NetCore - **PostMessageApp** for this purpose. One can use any type of Azure Function of their choice
- Visual Studio Code or Visual Studio both have easy integration with Azure Resource management. Any other IDE with appropriate plugins can be used as well. This exercise would use VSCode as an option
- Open Function App  root folder in Visual Studio Code
- Right Click and **Deploy** to Function App. Please note one can create the Function App in the portal and then manage deployment from VSCode
- VSCode would ask for a new App to be Created Or Deploy on an existing one
- The Target Location step is extremely important - ***should be the <u>CustomLocation</u> created in earlier steps***
- Once the steps are completed, comeback to Azure CLI
- Check *Deployments* and/or *Pods* of the App Service Namespace in the K8s cluster. All Pods should be in the running state
- Go to Azure Portal and Check the Function App  resource; in the Overview blade it will show up the Web API access URL
- Check the URL in te browser; use Postman or any REST client to call to test different paths of the Function App



#### Logic App

- This execise uses a simple *Blob Triggerred* Logic App Created Locally - **WorkflowApp** for this purpose
- Few points to note here on the choice of Creation path to Azure and subsequent Deployment onto K8s cluster
  - This Logic App type would be **<u>Standard</u>** and **Stateful** which is actually a **<u>Single Tenant Logic App</u>**; rather than the *Consumption* type Logic App which is *Multi-Tenant* Logic App
  - Currently the best way to achieve a seamless experiene end-to-end is to Create and Deploy Logic App Standard, Stateful type from Visual Studio Code itself
  - Not all triggers are available for **Standard** mode as of now
  - This exercise uses a simple *Blob trigger* for demonstration
- Visual Studio Code or Visual Studio both have easy integration with Azure Resource management. Any other IDE with appropriate plugins can be used as well. This exercise would use VSCode as an option
- Open Logic  App  root folder in Visual Studio Code
- Right Click and **Deploy** to Logic App
- VSCode would ask for a new App to be Created Or Deploy on an existing one
- The Target Location step is extremely important - ***should be the <u>CustomLocation</u> created in earlier steps***
- Once the steps are completed, comeback to Azure CLI
- Check *Deployments* and/or *Pods* of the App Service Namespace in the K8s cluster. All Pods should be in the running state
- Go to Azure Portal and Check the App Service resource; in the Overview blade it will show up the Web API access URL
- Check the URL in te browser; use Postman or any REST client to call 



#### Event Grid

- This exercise uses a simple *Event Grid Topic* - **PostTopic** for this purpose

- Set local varibales in Azure CLI

  ```bash
  evgExtensionName="$clusterName-ext-eg"
  evgExtensionNamespace="$clusterName-evg-ns"
  evgTopicName="$clusterName-egt"
  evgSubscriptionName="$clusterName-evg-sub"
  ```

- **Deploy** a *PersistentVolume* using Helm chart

  - The Storage Account created in earlier step while preparing for App Services can be used here as well as Persistent Storage for the K8s Cluster

  - Used by *Application Services* Extension Pods, to be created later
  - The Pods would have a PVC with a request of 100Gi memory requirement
  - This PV would be Bound with the PVC and allow the Pod(s) to be created successfully

  ```bash
  helm-aks install pv-arc-eg-chart -n default $baseFolderPath/Helms/pv-chart/ -f $baseFolderPath/Helms/pv-chart/values-eg.yaml
  helm-aks upgrade pv-arc-eg-chart -n default $baseFolderPath/Helms/pv-chart/ -f $baseFolderPath/Helms/pv-chart/values-eg.yaml
  
  # if you want to Uninstall the chart
  #helm-aks uninstall pv-arc-eg-chart -n defaul
  ```

- **Create** *Event Grid* extension for Azure Arc on K8s

  This step is easy to be done through portal as there are many config options - https://docs.microsoft.com/en-us/azure/event-grid/kubernetes/install-k8s-extension

- Check the event Grid extension creation process

  ```bash
  az k8s-extension show -c $connectedClusterName --cluster-type connectedClusters \
  -n $evgExtensionName -g $arcResourceGroupName
  ```

- Visual Studio Code or Visual Studio both DONOT have integration with Azure Arc flavour for EventGrid as of now. So, creating the Topic in portal is the only option as of now 

- The Target Location step is extremely important - ***should be the <u>CustomLocation</u> created in earlier steps***

- **Check** *Topic* details

  ```bash
  topicId=$(az eventgrid topic show --name $topicName --resource-group $arcServicesResourceGroup --query id -o tsv)
  echo $topicId
  ```

- Create *Event Subscription* for the above topic

  ```bash
  az eventgrid event-subscription create --name $eventSubName --source-resource-id $topicId \
  --endpoint <event_subscription_endpoint>
  
   # e.g. function app endpoint that we had created earlier
  ```

- Check *Deployments* and/or *Pods* of the EventGrid Namespace in the K8s cluster. All Pods should be in the running state

  ```bash
  kubectl get po -n $eventGridnamespace
  ```

- Create a sample app with K8s Cluster - say *Nginx Server* app

- Get inside the **Nginx** Pod

- Get *EventGrid* **Endpoint** details

  ```bash
  eventGridEndpoint=$(az eventgrid topic show --name $topicName -g $arcServicesResourceGroup --query "endpoint" --output tsv)
  ```

- Get *EventGrid* **Key** details

  ```bash
  eventGridKey=$(az eventgrid topic key list --name $topicName -g $arcServicesResourceGroup --query "key1" --output tsv)
  ```

- Make an Http call using Curl being within the Pod; this would send an event to Event Grid topic

  ```bash
  curl -kv -X POST -H "Content-Type: application/cloudevents-batch+json" -H "aeg-sas-key: $eventGridKey" \
  -g $eventGridEndpoint \
  -d  '[{ 
        "specversion": "1.0",
        "type" : "orderCreated",
        "source": "myCompanyName/us/webCommerceChannel/myOnlineCommerceSiteBrandName",
        "id" : "eventId-n",
        "time" : "2020-12-25T20:54:07+00:00",
        "subject" : "account/acct-123224/order/o-123456",
        "dataSchema" : "1.0",
        "data" : {
           "orderId" : "123892",
           "orderType" : "PO",
           "reference" : "https://www.myCompanyName.com/orders/123"
        }
  }]'
  ```

  

- This in-turn calls the subscription endpoint; check if the PostMessageApp Function being called

  











