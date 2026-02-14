package cz.samofujera.catalog.internal;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

@Service
public class R2StorageService {

    @Value("${r2.endpoint}")
    private String endpoint;

    @Value("${r2.access-key}")
    private String accessKey;

    @Value("${r2.secret-key}")
    private String secretKey;

    @Value("${r2.bucket}")
    private String bucket;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    void init() {
        var credentials = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey));

        this.s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .forcePathStyle(true)
            .build();

        this.presigner = S3Presigner.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .build();
    }

    @PreDestroy
    void destroy() {
        if (s3Client != null) {
            s3Client.close();
        }
        if (presigner != null) {
            presigner.close();
        }
    }

    public void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        var request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .contentLength(contentLength)
            .build();

        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
    }

    public void delete(String key) {
        var request = DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        s3Client.deleteObject(request);
    }

    public String generatePresignedUrl(String key, Duration ttl) {
        var getObjectRequest = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        var presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(ttl)
            .getObjectRequest(getObjectRequest)
            .build();

        return presigner.presignGetObject(presignRequest).url().toExternalForm();
    }
}
