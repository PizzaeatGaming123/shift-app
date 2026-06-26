package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.StaffRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StaffControllerTest {

    @Autowired MockMvc mvc;
    @Autowired StaffRepository staffRepository;

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void putStaff_updatesMonthlyHourLimit() throws Exception {
        var staff = staffRepository.findByUsername("nakashima-1").orElseThrow();
        mvc.perform(put("/api/staff/" + staff.getId()).with(csrf())
                .contentType("application/json")
                .content("{\"hourlyWage\":null,\"monthlyHourLimit\":87}"))
           .andExpect(status().isOk());
        var updated = staffRepository.findById(staff.getId()).orElseThrow();
        assertThat(updated.getMonthlyHourLimit()).isEqualTo(87);
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void putStaff_acceptsNullMonthlyHourLimit() throws Exception {
        var staff = staffRepository.findByUsername("nakashima-1").orElseThrow();
        // 一度値を入れる
        mvc.perform(put("/api/staff/" + staff.getId()).with(csrf())
                .contentType("application/json")
                .content("{\"hourlyWage\":null,\"monthlyHourLimit\":87}"))
           .andExpect(status().isOk());
        // null で送っても上書きされない（既存ロジック踏襲）
        mvc.perform(put("/api/staff/" + staff.getId()).with(csrf())
                .contentType("application/json")
                .content("{\"hourlyWage\":null,\"monthlyHourLimit\":null}"))
           .andExpect(status().isOk());
        var updated = staffRepository.findById(staff.getId()).orElseThrow();
        assertThat(updated.getMonthlyHourLimit()).isEqualTo(87);
    }
}
