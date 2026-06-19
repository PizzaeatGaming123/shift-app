package jp.akiyume.shift.seed;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Provides the {@link PasswordEncoder} bean required by {@link DataSeeder}.
 *
 * NOTE (plan ordering): Task 8 (SecurityConfig) is intended to define this bean, but
 * DataSeeder (Task 7) needs it earlier. This temporary config supplies it so the
 * Task 7 tests can pass standalone. When Task 8's SecurityConfig is added with its own
 * {@code passwordEncoder()} bean, REMOVE this class (or drop the bean from SecurityConfig)
 * to avoid a duplicate-bean conflict.
 */
@Configuration
public class SeederSupportConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
