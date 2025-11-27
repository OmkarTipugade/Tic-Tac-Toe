
---


## Deploying Nakama on Google Cloud Platform (GCP)

This document provides a step-by-step guide for deploying a Nakama server on Google Cloud Platform using a Compute Engine VM instance, Docker, and Docker Compose.

---

## 1. Create a Google Cloud Project

1. Open [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select Project** → **New Project**
3. Enter a project name (e.g., `nakama-server`)
4. Click **Create**

---

## 2. Enable Compute Engine

1. In the left navigation menu, search for **Compute Engine**
2. Click **VM Instances**
3. Wait for the Compute Engine API to initialize

---

## 3. Create a VM Instance

1. Click **Create Instance**
2. Set the instance name, for example: `nakama-vm`

### Region and Zone

Choose a region and zone close to you or your players.

### Machine Type

Select:

```
e2-medium (2 vCPU, 4GB RAM)
```

This is suitable for development.
For production, consider `e2-standard-4` or higher.

### Boot Disk

Click **Change** and configure:

* Operating System: Ubuntu
* Version: Ubuntu 20.04 LTS
* Disk Size: 40–60 GB SSD

Click **Select**

### Firewall

Check the following options:

* Allow HTTP traffic
* Allow HTTPS traffic

---

## 4. Connect to the VM Using SSH
In your created instance row click on SSH button

---

## 5. Install Docker

Run the following commands on the VM:

```
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```


## 6. Download Nakama Docker Compose File

Run:

```
curl -fsSL https://raw.githubusercontent.com/heroiclabs/nakama/master/docker-compose.yml -o docker-compose.yml
```

This downloads the official Nakama deployment file.

---

## 7. Start Nakama

Start Nakama and the database:

```
docker compose up 
```

Nakama will now be running in the background.

---

## 8. Open Required Firewall Ports on GCP

By default, Google Cloud blocks all ports except 22, 80, and 443.
You must manually allow Nakama ports (7350 and 7351).

### Steps:

1. Go to **VPC Network** → **Firewall**
2. Click **Create Firewall Rule**

### Example Rule for Port 7350

* Name: `allow-nakama-7350`
* Network: `default`
* Targets: All instances
* Source: `0.0.0.0/0`
* Protocols and Ports: TCP → `7350`,`7351`

Click **Create**

### Example Rule for Port 7351

* Name: `allow-nakama-7351`
* Network: `default`
* Targets: All instances
* Source: `0.0.0.0/0`
* Protocols and Ports: TCP → `7351`

Click **Create**

---

## 11. Verify Deployment

Open in your browser:

Nakama Console:

```
http://<EXTERNAL_IP>:7351
```


---

