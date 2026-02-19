package cz.samofujera;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SamoFujeraApplication {
    public static void main(String[] args) {
        SpringApplication.run(SamoFujeraApplication.class, args);
    }
}
