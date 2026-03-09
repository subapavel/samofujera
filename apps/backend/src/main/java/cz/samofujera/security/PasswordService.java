package cz.samofujera.security;

import com.password4j.Argon2Function;
import com.password4j.Password;
import com.password4j.types.Argon2;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordService {

    private static final Argon2Function ARGON2 = Argon2Function.getInstance(
            65536, // 64 MB memory
            3,     // iterations
            1,     // parallelism
            32,    // hash length
            Argon2.ID
    );

    public String hash(String password) {
        return Password.hash(password).with(ARGON2).getResult();
    }

    public boolean verify(String password, String hash) {
        return Password.check(password, hash).with(ARGON2);
    }
}
