package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.ShiftChangeHistoryRepository;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.ShiftChangeDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/shift-changes")
public class ShiftChangeHistoryController {

    private final ShiftChangeHistoryRepository historyRepository;
    private final StoreAccessGuard guard;

    public ShiftChangeHistoryController(ShiftChangeHistoryRepository historyRepository,
                                        StoreAccessGuard guard) {
        this.historyRepository = historyRepository;
        this.guard = guard;
    }

    @GetMapping
    public List<ShiftChangeDto> list(@PathVariable Long storeId, @RequestParam String month,
                                     Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        YearMonth ym = YearMonth.parse(month);
        return historyRepository.findByStore_IdAndDateBetweenOrderByChangedAtDesc(
                storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(ShiftChangeDto::from).toList();
    }
}
