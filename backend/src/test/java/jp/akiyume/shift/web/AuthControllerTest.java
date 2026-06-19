package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void me_withoutLogin_returns401() throws Exception {
        mvc.perform(get("/api/auth/me"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    void login_thenMe_returnsUser() throws Exception {
        var session = mvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"nakashima-mgr\",\"password\":\"password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MANAGER"))
                .andReturn().getRequest().getSession();

        mvc.perform(get("/api/auth/me").session(
                (org.springframework.mock.web.MockHttpSession) session))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.name").value("山田（店長）"));
    }

    @Test
    void login_withWrongPassword_returns401() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"nakashima-mgr\",\"password\":\"wrong\"}"))
           .andExpect(status().isUnauthorized());
    }
}
