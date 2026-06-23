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
    void putRequest_mid_isRejected() throws Exception {
        mvc.perform(put("/api/requests")
                .contentType("application/json")
                .content("{\"date\":\"2026-07-01\",\"value\":\"mid\"}"))
           .andExpect(status().isBadRequest());
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

    @Test
    @WithMockUser(username = "nakashima-1")
    void submitRequests_savesRequestsAndNotesTogether() throws Exception {
        mvc.perform(put("/api/requests/submission")
                .contentType("application/json")
                .content("""
                    {"entries":[
                      {"date":"2026-07-10","value":"early","startTime":"10:00","endTime":"18:30","note":"午前希望です"},
                      {"date":"2026-07-11","value":"off","note":""}
                    ]}
                    """))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/requests?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[?(@.date == '2026-07-10')].slot").value("early"))
           .andExpect(jsonPath("$[?(@.date == '2026-07-10')].startTime").value("10:00"))
           .andExpect(jsonPath("$[?(@.date == '2026-07-10')].endTime").value("18:30"))
           .andExpect(jsonPath("$[?(@.date == '2026-07-11')].slot").value("off"));

        mvc.perform(get("/api/stores/1/day-notes?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[?(@.date == '2026-07-10')].text").value("午前希望です"));
    }
}
