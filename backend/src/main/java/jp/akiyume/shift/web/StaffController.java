package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.StaffService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.UpdateStaffBody;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;
    private final StoreAccessGuard guard;

    public StaffController(StaffService staffService, StoreAccessGuard guard) {
        this.staffService = staffService;
        this.guard = guard;
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody UpdateStaffBody body,
                       Authentication auth) {
        Long callerStoreId = guard.requireSelf(auth).getStore().getId();
        // 操作対象スタッフが自店舗所属であることを確認（他店舗の時給を改竄できないように）
        guard.requireStaffInStore(id, callerStoreId);
        staffService.updateRankSkills(id, body.rank(), body.skills(), body.hourlyWage());
    }
}
