terraform {
  required_version = ">= 1.5.0"
}

# Local Terraform demonstration.
resource "terraform_data" "local_demo" {
  input = {
    project = "TaskFlow"
    purpose = "DevOps capstone demonstration"
  }
}

# FUTURE AZURE CONFIGURATION
#
# resource "azurerm_resource_group" "taskflow" {
#   name     = "taskflow-rg"
#   location = "West Europe"
# }
#
# Enable the AzureRM provider and this resource
# when Azure authentication and sufficient credit are available.
