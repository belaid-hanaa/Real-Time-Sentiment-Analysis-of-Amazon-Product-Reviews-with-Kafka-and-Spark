# Utiliser une image officielle Python légère
FROM python:3.11-slim

# Définir le répertoire de travail dans le container
WORKDIR /app

# Copier requirements.txt et installer les dépendances
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le contenu local dans /app
COPY . .

# Exposer le port 8000 (celui où uvicorn va tourner)
EXPOSE 8005

# Commande pour lancer l'application avec uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
