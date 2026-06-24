package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.NotificationService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.NotificationDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final StoreAccessGuard guard;

    public NotificationController(NotificationService notificationService, StoreAccessGuard guard) {
        this.notificationService = notificationService;
        this.guard = guard;
    }

    @GetMapping
    public List<NotificationDto> mine(Authentication auth) {
        var self = guard.requireSelf(auth);
        return notificationService.listFor(self.getId()).stream()
                .map(NotificationDto::from).toList();
    }

    @PutMapping("/{id}/read")
    public void markRead(@PathVariable Long id, Authentication auth) {
        var self = guard.requireSelf(auth);
        notificationService.markRead(id, self.getUsername());
    }
}
