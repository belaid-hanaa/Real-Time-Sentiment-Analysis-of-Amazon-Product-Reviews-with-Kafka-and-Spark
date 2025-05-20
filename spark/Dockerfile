FROM bitnami/spark:3.3

# Passer en root pour installation
USER root

# Installer pip et dépendances Python
RUN apt-get update && apt-get install -y python3-pip python3-dev

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers nécessaires
COPY requirements.txt /app/
COPY spark_streaming.py /app/
COPY review_sentiment/ /opt/bitnami/spark/model/review_sentiment

# Installer les paquets Python requis (incluant nltk)
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Télécharger les données NLTK après installation de nltk
ENV NLTK_DATA=/opt/nltk_data
RUN mkdir -p /opt/nltk_data && \
    python3 -c "import nltk; nltk.download('stopwords', download_dir='/opt/nltk_data'); nltk.download('wordnet', download_dir='/opt/nltk_data')"

# Revenir à l'utilisateur Spark
USER 1001
