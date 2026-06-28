package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.RequestService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.RequestDto;
import jp.akiyume.shift.web.dto.SetRequestBody;
import jp.akiyume.shift.web.dto.SubmitRequestsBody;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class RequestController {

    private final RequestService requestService;
    private final StoreAccessGuard guard;

    public RequestController(RequestService requestService, StoreAccessGuard guard) {
        this.requestService = requestService;
        this.guard = guard;
    }

    @PutMapping("/requests")
    public List<RequestDto> setRequest(@RequestBody SetRequestBody body, Authentication auth) {
        LocalDate date = LocalDate.parse(body.date());
        return requestService.setDayRequest(guard.requireSelf(auth).getUsername(), date, body.value())
                .stream().map(RequestDto::from).toList();
    }

    @PutMapping("/requests/submission")
    public void submit(@RequestBody SubmitRequestsBody body, Authentication auth) {
        requestService.submit(guard.requireSelf(auth).getUsername(), body.entries());
    }

    @GetMapping("/stores/{storeId}/requests")
    public List<RequestDto> requests(@PathVariable Long storeId, @RequestParam String month,
                                     Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        YearMonth ym = YearMonth.parse(month);
        return requestService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(RequestDto::from).toList();
    }
}
