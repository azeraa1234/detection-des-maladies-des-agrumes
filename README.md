# 🌿 Jumeau Numérique Agrumicole

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TanStack-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![YOLOv12](https://img.shields.io/badge/AI-YOLOv12-FF9900.svg)](https://github.com/sunsmarterjie/yolov12)

Une solution complète de **Jumeau Numérique** pour le secteur agrumicole. L'application permet aux agriculteurs et aux ingénieurs agronomes de détecter en temps réel les maladies des agrumes (feuilles et fruits) à l'aide d'une Intelligence Artificielle basée sur **YOLOv12**.

## 🚀 Fonctionnalités Principales

- **Détection IA Avancée** : Analyse des images de feuilles et de fruits pour détecter automatiquement les maladies, parasites et carences avec YOLOv12.
- **Tableau de Bord Agronomique** : Suivi de l'historique des analyses, statistiques de santé des cultures et recommandations générées par IA (Gemini).
- **Architecture Microservices** : Conçu pour être robuste, évolutif et prêt pour la production via Docker.
- **Interface Rapide et Réactive** : Application SSR construite sur TanStack Start et React.

## 🏗️ Architecture du Projet

L'application est divisée en trois conteneurs principaux orchestrés par Docker Compose :

1. **Frontend (`agri_scan_frontend`)** : Interface utilisateur en React / TanStack Start, servie par l'environnement Cloudflare Workers (`wrangler`).
2. **Backend (`agri_scan_backend`)** : API haute performance développée avec Python et FastAPI. Gère l'authentification (JWT), l'accès à la base de données (SQLite/aiosqlite) et l'inférence des modèles de Computer Vision (YOLOv12, OpenCV).
3. **Reverse Proxy (`agri_scan_proxy`)** : Nginx écoute sur le port 80. Il achemine le trafic `/api` vers le backend et le reste vers le frontend, résolvant nativement les problématiques CORS.

## ⚙️ Prérequis

Assurez-vous d'avoir les éléments suivants installés sur votre machine ou serveur :
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 🏃‍♂️ Déploiement Local (Production Ready)

L'installation et le déploiement sont entièrement automatisés grâce à Docker.

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/azeraa1234/detection-des-maladies-des-agrumes.git
   cd detection-des-maladies-des-agrumes
   ```

2. Lancez l'environnement complet :
   ```bash
   docker-compose up --build -d
   ```

3. Accédez à l'application web :
   - Interface : [http://localhost](http://localhost)
   - Documentation de l'API (Swagger UI) : [http://localhost/api/docs](http://localhost/api/docs)

## 🧰 Stack Technique

**Frontend**
- React 19
- Vite & TanStack Start (SSR)
- Tailwind CSS & Radix UI (shadcn/ui)

**Backend**
- Python 3.10
- FastAPI
- YOLOv12 & PyTorch
- SQLAlchemy (Async) & SQLite

**DevOps**
- Docker & Docker Compose
- Nginx Reverse Proxy
