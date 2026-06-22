package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.StaffService;
import jp.akiyume.shift.web.dto.UpdateStaffBody;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody UpdateStaffBody body) {
        staffService.updateRankSkills(id, body.rank(), body.skills());
    }
}
