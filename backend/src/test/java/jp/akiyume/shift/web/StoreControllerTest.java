package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StoreControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void stores_withoutLogin_returns401() throws Exception {
        mvc.perform(get("/api/stores")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr")
    void stores_loggedIn_returnsThree() throws Exception {
        mvc.perform(get("/api/stores"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr")
    void storeStaff_returnsList() throws Exception {
        // 中島店(id=1想定) のスタッフが5名
        mvc.perform(get("/api/stores/1/staff"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(5));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr")
    void managerCanReadOtherStoreStaff() throws Exception {
        mvc.perform(get("/api/stores/2/staff"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(5))
           .andExpect(jsonPath("$[0].name").exists());
    }
}
