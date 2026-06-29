package jp.akiyume.shift.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {

    /**
     * 開発時のみ /h2-console を許可するチェイン。
     * app.h2-console-enabled=true のときだけ有効化され、本番デフォルトでは存在しないため
     * /h2-console は 401 になり、SQL 管理画面が公開されない。
     */
    @Bean
    @Order(1)
    @ConditionalOnProperty(name = "app.h2-console-enabled", havingValue = "true")
    SecurityFilterChain h2ConsoleChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/h2-console/**")
            .authorizeHttpRequests(a -> a.anyRequest().permitAll())
            .csrf(csrf -> csrf.disable())
            .headers(h -> h.frameOptions(f -> f.sameOrigin()));
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        // Spring Security 6 の既定 XorCsrfTokenRequestAttributeHandler は SPA の
        // 「Cookie の生トークンをそのまま X-XSRF-TOKEN ヘッダに載せる」運用と非互換のため、
        // 非 XOR の CsrfTokenRequestAttributeHandler を使い、setCsrfRequestAttributeName(null) で
        // 毎レスポンスに Set-Cookie を出させる（遅延発行を無効化）。
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName(null);
        http
            // CSRF は Cookie/Header 方式で有効化。ログインのみ例外（事前にトークンを取れないため）。
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(csrfHandler)
                .ignoringRequestMatchers("/api/auth/login"))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/assignments").hasRole("MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/assignments").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/stores/*/store-notes").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/staff/*").hasRole("MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/stores/*/staff").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/stores/*/recruitments").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/stores/*/shift-plans/*/status").hasRole("MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/stores/*/shift-plans/*/release").hasRole("MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/stores/*/staff/*/requests").hasRole("MANAGER")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .exceptionHandling(e -> e.authenticationEntryPoint(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
