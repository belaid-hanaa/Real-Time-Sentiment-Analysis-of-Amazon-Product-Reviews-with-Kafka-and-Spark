from pyspark.sql.functions import udf, col, from_json
from pyspark.sql.types import StructType, StringType
from pyspark.ml import PipelineModel
from pyspark.sql import SparkSession
import re
from pyspark.sql.functions import pandas_udf
import os
import pandas as pd

@pandas_udf(StringType())
def clean_text_udf(texts: pd.Series) -> pd.Series:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer

    nltk_data_path = '/opt/nltk_data'
    # Assure-toi que le dossier existe
    os.makedirs(nltk_data_path, exist_ok=True)

    # Ajouter le chemin personnalisé pour nltk
    nltk.data.path.append(nltk_data_path)

    # Télécharger uniquement si pas déjà présent (pour éviter répétitions)
    try:
        stop_words = set(stopwords.words('english'))
    except LookupError:
        nltk.download('stopwords', download_dir=nltk_data_path)
        stop_words = set(stopwords.words('english'))
    try:
        _ = WordNetLemmatizer()
    except LookupError:
        nltk.download('wordnet', download_dir=nltk_data_path)

    lemmatizer = WordNetLemmatizer()

    def clean(text):
        if text is None:
            return ""
        text = re.sub(r'[^a-zA-Z]', ' ', text.lower())
        tokens = text.split()
        tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words]
        return ' '.join(tokens)

    return texts.apply(clean)
def write_to_mongo(batch_df, batch_id):
    print(f"write_to_mongo called for batch {batch_id}")
    print(f"Number of records: {batch_df.count()}")
    batch_df.show(truncate=True)  # Voir les données avant insertion
    try:
        batch_df.write \
            .format("mongo") \
            .mode("append") \
            .option("uri", "mongodb://mongo:27017/amazon.predictions") \
            .save()
        print(f"Successfully written batch {batch_id} to MongoDB")
    except Exception as e:
        print(f"Failed to write to MongoDB for batch {batch_id}: {str(e)}")


def main():
    # 1. Créer la session Spark
    spark = SparkSession.builder \
        .appName("AmazonReviewSentimentStreaming") \
        .master("spark://spark-master:7077") \
        .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1") \
        .getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    
    schema = StructType().add("reviewText", StringType())

    # 3. Lire depuis Kafka
    kafka_servers = "kafka1:9092,kafka2:9093,kafka3:9094"
    topic = "amazon_reviews"

    df_kafka = spark.readStream.format("kafka") \
        .option("kafka.bootstrap.servers", kafka_servers) \
        .option("subscribe", topic) \
        .option("startingOffsets", "latest") \
        .load()

    # 4. Extraire le texte des avis
    df_reviews = df_kafka.selectExpr("CAST(value AS STRING)") \
        .select(from_json(col("value"), schema).alias("data")) \
        .select(col("data.reviewText").alias("reviewText")) \
        .na.drop()

    df_cleaned = df_reviews.withColumn("clean_text", clean_text_udf(col("reviewText")))


    # 6. Charger le modèle entraîné
    pipeline_path = "/opt/bitnami/spark/model/review_sentiment"
    pipeline_model = PipelineModel.load(pipeline_path)

  
    df_predictions = pipeline_model.transform(df_cleaned)

    # 8. Résultat final
    df_result = df_predictions.select("reviewText", "prediction")

    # 9. Affichage en console
    console_query = df_result.writeStream \
        .outputMode("append") \
        .format("console") \
        .option("truncate", False) \
        .start()

    # 10. Sauvegarde vers MongoDB via foreachBatch
    mongo_query = df_result.writeStream \
        .outputMode("append") \
        .foreachBatch(write_to_mongo) \
        .option("checkpointLocation", "/tmp/checkpoint/review_sentiment") \
        .trigger(processingTime='5 seconds') \
        .start()

    # 11. Attente de fin
    console_query.awaitTermination()
    mongo_query.awaitTermination()


if __name__ == "__main__":
    main()
