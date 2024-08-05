# Docker image
FROM docker.io/eclipse-temurin:21-jdk-alpine

ARG JAR_FILE=target/*.jar

WORKDIR /opt/app

COPY ${JAR_FILE} app.jar

# Regular user
RUN addgroup -S appuser && adduser -S appuser -G appuser \
    && chown -R appuser:appuser /opt/app
USER appuser

ENTRYPOINT ["java","-jar","app.jar"]

