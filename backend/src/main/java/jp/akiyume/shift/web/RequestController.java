package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.RequestService;
import jp.akiyume.shift.web.dto.RequestDto;
import jp.akiyume.shift.web.dto.SetRequestBody;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @PutMapping("/requests")
    public List<RequestDto> setRequest(@RequestBody SetRequestBody body, Authentication auth) {
        LocalDate date = LocalDate.parse(body.date());
        return requestService.setDayRequest(auth.getName(), date, body.value())
                .stream().map(RequestDto::from).toList();
    }

    @GetMapping("/stores/{storeId}/requests")
    public List<RequestDto> requests(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return requestService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(RequestDto::from).toList();
    }
}
