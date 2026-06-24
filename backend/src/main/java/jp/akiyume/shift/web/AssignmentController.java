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
        assignmentService.assign(body.storeId(), LocalDate.parse(body.date()), body.slot(),
                body.staffId(), auth.getName());
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
