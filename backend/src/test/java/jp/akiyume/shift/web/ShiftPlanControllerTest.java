package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ShiftPlanControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void get_initializesToDraft() throws Exception {
        mvc.perform(get("/api/stores/1/shift-plans/2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.status").value("DRAFT"))
           .andExpect(jsonPath("$.month").value("2026-07"));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void setStatus_followsAllowedTransitions() throws Exception {
        // DRAFT → CONFIRMED → PUBLISHED が許容
        mvc.perform(put("/api/stores/1/shift-plans/2026-07/status").with(csrf())
                .contentType("application/json").content("{\"status\":\"CONFIRMED\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mvc.perform(put("/api/stores/1/shift-plans/2026-07/status").with(csrf())
                .contentType("application/json").content("{\"status\":\"PUBLISHED\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void setStatus_rejectsInvalidTransition() throws Exception {
        // DRAFT から直接 PUBLISHED は禁止
        mvc.perform(put("/api/stores/1/shift-plans/2026-07/status").with(csrf())
                .contentType("application/json").content("{\"status\":\"PUBLISHED\"}"))
           .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void staff_cannotSetStatus() throws Exception {
        mvc.perform(put("/api/stores/1/shift-plans/2026-07/status").with(csrf())
                .contentType("application/json").content("{\"status\":\"CONFIRMED\"}"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void crossStore_get_returns403() throws Exception {
        mvc.perform(get("/api/stores/2/shift-plans/2026-07"))
           .andExpect(status().isForbidden());
    }
}
