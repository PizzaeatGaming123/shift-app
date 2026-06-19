package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.AssignmentService;
import jp.akiyume.shift.web.dto.AssignmentBody;
import jp.akiyume.shift.web.dto.AssignmentDto;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping("/assignments")
    public void assign(@RequestBody AssignmentBody body) {
        assignmentService.assign(body.storeId(), LocalDate.parse(body.date()), body.slot(), body.staffId());
    }

    @DeleteMapping("/assignments")
    public void unassign(@RequestBody AssignmentBody body) {
        assignmentService.unassign(body.storeId(), LocalDate.parse(body.date()), body.slot(), body.staffId());
    }

    @GetMapping("/stores/{storeId}/assignments")
    public List<AssignmentDto> assignments(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return assignmentService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(AssignmentDto::from).toList();
    }
}
