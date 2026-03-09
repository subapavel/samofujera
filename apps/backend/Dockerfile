# Stage 1: Build native image
FROM ghcr.io/graalvm/native-image-community:21 AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -Pnative -DskipTests

# Stage 2: Minimal runtime
FROM registry.access.redhat.com/ubi8/ubi-minimal:8.9
WORKDIR /work/
COPY --from=build /app/target/*-runner /work/application
RUN chmod 775 /work/application
EXPOSE 8080
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
