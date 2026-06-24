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
class AssignmentControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void manager_canAssign_thenGet() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":2}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/assignments?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].slot").value("early"));
    }

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void staff_cannotAssign_returns403() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":2}"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void delete_removesAssignment() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-04\",\"slot\":\"late\",\"staffId\":3}"))
           .andExpect(status().isOk());
        mvc.perform(delete("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-04\",\"slot\":\"late\",\"staffId\":3}"))
           .andExpect(status().isOk());
        mvc.perform(get("/api/stores/1/assignments?month=2026-07"))
           .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void crossStore_assign_returns403() throws Exception {
        // 中島店マネージャが他店舗(storeId=2)へ割り当てようとする
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":2,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":7}"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void assign_withStaffFromOtherStore_returns403() throws Exception {
        // staffId=6 は新田店(storeId=2)のスタッフ
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":7}"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void malformedDate_returns400() throws Exception {
        mvc.perform(get("/api/stores/1/assignments?month=oops"))
           .andExpect(status().isBadRequest());
    }
}
