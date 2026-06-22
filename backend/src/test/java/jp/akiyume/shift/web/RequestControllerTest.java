package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RequestControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-1")
    void putRequest_mid_thenGet_showsMid() throws Exception {
        mvc.perform(put("/api/requests")
                .contentType("application/json")
                .content("{\"date\":\"2026-07-01\",\"value\":\"mid\"}"))
           .andExpect(status().isOk());

        // 中島店(id=1) の7月希望に中番が含まれる
        mvc.perform(get("/api/stores/1/requests?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].slot").value("mid"));
    }

    @Test
    @WithMockUser(username = "nakashima-1")
    void putRequest_off_replacesPrevious() throws Exception {
        mvc.perform(put("/api/requests").contentType("application/json")
                .content("{\"date\":\"2026-07-02\",\"value\":\"early\"}"))
           .andExpect(status().isOk());
        mvc.perform(put("/api/requests").contentType("application/json")
                .content("{\"date\":\"2026-07-02\",\"value\":\"off\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].slot").value("off"));
    }
}
