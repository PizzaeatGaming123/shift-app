package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.nullValue;
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

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void assign_withTimes_persistsStartEnd() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-08-03\",\"slot\":\"early\",\"staffId\":2,"
                        + "\"startTime\":\"09:00\",\"endTime\":\"13:00\"}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/assignments?month=2026-08"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].startTime").value("09:00"))
           .andExpect(jsonPath("$[0].endTime").value("13:00"));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void assign_withoutTimes_returnsNullTimes() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-08-04\",\"slot\":\"late\",\"staffId\":3}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/assignments?month=2026-08"))
           .andExpect(jsonPath("$[0].startTime").value(nullValue()))
           .andExpect(jsonPath("$[0].endTime").value(nullValue()));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void assign_onlyStartTime_returns400() throws Exception {
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-08-05\",\"slot\":\"early\",\"staffId\":2,"
                        + "\"startTime\":\"09:00\"}"))
           .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void reassign_updatesTimes() throws Exception {
        // 既存の(同店舗・同日・同slot・同staff)に対する再ポストは時間を更新する
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-08-06\",\"slot\":\"early\",\"staffId\":2,"
                        + "\"startTime\":\"09:00\",\"endTime\":\"13:00\"}"))
           .andExpect(status().isOk());
        mvc.perform(post("/api/assignments").with(csrf()).contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-08-06\",\"slot\":\"early\",\"staffId\":2,"
                        + "\"startTime\":\"10:00\",\"endTime\":\"14:00\"}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/assignments?month=2026-08"))
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].startTime").value("10:00"))
           .andExpect(jsonPath("$[0].endTime").value("14:00"));
    }
}
