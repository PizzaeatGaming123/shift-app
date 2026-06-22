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
class NoteControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void staff_setsDayNote_thenItAppearsInStoreList() throws Exception {
        mvc.perform(put("/api/day-notes").contentType("application/json")
                .content("{\"date\":\"2026-07-05\",\"text\":\"変わってくれませんか？\"}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/day-notes?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].text").value("変わってくれませんか？"));
    }

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void emptyText_deletesDayNote() throws Exception {
        mvc.perform(put("/api/day-notes").contentType("application/json")
                .content("{\"date\":\"2026-07-06\",\"text\":\"応援お願いします\"}"))
           .andExpect(status().isOk());
        mvc.perform(put("/api/day-notes").contentType("application/json")
                .content("{\"date\":\"2026-07-06\",\"text\":\"\"}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/day-notes?month=2026-07"))
           .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void manager_setsStoreNote_thenGet() throws Exception {
        mvc.perform(put("/api/stores/1/store-notes").contentType("application/json")
                .content("{\"date\":\"2026-07-07\",\"text\":\"ポイント2倍\"}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/store-notes?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].text").value("ポイント2倍"));
    }

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void staff_cannotSetStoreNote_returns403() throws Exception {
        mvc.perform(put("/api/stores/1/store-notes").contentType("application/json")
                .content("{\"date\":\"2026-07-07\",\"text\":\"だめ\"}"))
           .andExpect(status().isForbidden());
    }
}
