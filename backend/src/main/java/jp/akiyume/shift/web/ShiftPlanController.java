package jp.akiyume.shift.web;

import jp.akiyume.shift.domain.ShiftPlanStatus;
import jp.akiyume.shift.repo.service.ShiftPlanService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.SetShiftPlanStatusBody;
import jp.akiyume.shift.web.dto.ShiftPlanDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stores/{storeId}/shift-plans")
public class ShiftPlanController {

    private final ShiftPlanService shiftPlanService;
    private final StoreAccessGuard guard;

    public ShiftPlanController(ShiftPlanService shiftPlanService, StoreAccessGuard guard) {
        this.shiftPlanService = shiftPlanService;
        this.guard = guard;
    }

    @GetMapping("/{month}")
    public ShiftPlanDto get(@PathVariable Long storeId, @PathVariable String month,
                            Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        return ShiftPlanDto.from(shiftPlanService.getOrCreate(storeId, month));
    }

    @PutMapping("/{month}/status")
    public ShiftPlanDto setStatus(@PathVariable Long storeId, @PathVariable String month,
                                  @RequestBody SetShiftPlanStatusBody body, Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        ShiftPlanStatus next = ShiftPlanStatus.valueOf(body.status());
        return ShiftPlanDto.from(shiftPlanService.setStatus(storeId, month, next));
    }

    /** 確定解除：割当を全削除して計画を ADJUSTING に戻す。MANAGER 専用。 */
    @PostMapping("/{month}/release")
    public ShiftPlanDto release(@PathVariable Long storeId, @PathVariable String month,
                                Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        return ShiftPlanDto.from(shiftPlanService.release(storeId, month));
    }
}
