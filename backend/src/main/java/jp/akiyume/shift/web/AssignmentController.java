package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.AssignmentService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.AssignmentBody;
import jp.akiyume.shift.web.dto.AssignmentDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final StoreAccessGuard guard;

    public AssignmentController(AssignmentService assignmentService, StoreAccessGuard guard) {
        this.assignmentService = assignmentService;
        this.guard = guard;
    }

    @PostMapping("/assignments")
    public void assign(@RequestBody AssignmentBody body, Authentication auth) {
        guard.requireStoreAccess(auth, body.storeId());
        guard.requireStaffInStore(body.staffId(), body.storeId());
        // 開始/終了時刻は両方指定するか両方省略するかのみ許可（片方だけは意味が定まらない）
        if ((body.startTime() == null) != (body.endTime() == null)) {
            throw new IllegalArgumentException("startTime と endTime は両方指定するか両方省略してください");
        }
        assignmentService.assign(body.storeId(), LocalDate.parse(body.date()), body.slot(),
                body.staffId(), body.startTime(), body.endTime(), auth.getName());
    }

    @DeleteMapping("/assignments")
    public void unassign(@RequestBody AssignmentBody body, Authentication auth) {
        guard.requireStoreAccess(auth, body.storeId());
        guard.requireStaffInStore(body.staffId(), body.storeId());
        assignmentService.unassign(body.storeId(), LocalDate.parse(body.date()), body.slot(),
                body.staffId(), auth.getName());
    }

    @GetMapping("/stores/{storeId}/assignments")
    public List<AssignmentDto> assignments(@PathVariable Long storeId, @RequestParam String month,
                                           Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        YearMonth ym = YearMonth.parse(month);
        return assignmentService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(AssignmentDto::from).toList();
    }
}
