FROM bitnami/spark:3.3

USER root
WORKDIR /app

# Copier les fichiers nécessaires
COPY spark_streaming.py /opt/bitnami/spark/spark_streaming.py
COPY model/review_sentiment /opt/bitnami/model/review_sentiment
COPY requirements.txt /app/requirements.txt

RUN pip install nltk pyspark

RUN python -m nltk.downloader -d /opt/nltk_data stopwords wordnet

ENV NLTK_DATA=/opt/nltk_data
# Installer pip et les dépendances Python
RUN install_packages python3-pip
RUN pip install -r /app/requirements.txt

ENV PYSPARK_PYTHON=python3

# Lancer le script automatiquement
CMD ["spark-submit", "/opt/bitnami/spark/spark_streaming.py"]
