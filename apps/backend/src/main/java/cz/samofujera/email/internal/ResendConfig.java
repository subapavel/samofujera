package cz.samofujera.email.internal;

import com.resend.Resend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!dev")
class ResendConfig {

    @Bean
    Resend resend(@Value("${app.resend.api-key:re_test_key}") String apiKey) {
        return new Resend(apiKey);
    }
}
