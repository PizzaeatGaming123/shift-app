package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.Notification;
import jp.akiyume.shift.domain.Notification.Kind;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.NotificationRepository;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final StaffRepository staffRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               StaffRepository staffRepository) {
        this.notificationRepository = notificationRepository;
        this.staffRepository = staffRepository;
    }

    @Transactional
    public Notification create(Staff recipient, Kind kind, String message) {
        return notificationRepository.save(new Notification(recipient, kind, message));
    }

    @Transactional
    public void broadcastToStore(Long storeId, Kind kind, String message) {
        List<Staff> roster = staffRepository.findByStoreId(storeId);
        for (Staff person : roster) {
            notificationRepository.save(new Notification(person, kind, message));
        }
    }

    public List<Notification> listFor(Long recipientId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(recipientId);
    }

    @Transactional
    public void markRead(Long notificationId, String username) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!notification.getRecipient().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        notification.markRead();
        notificationRepository.save(notification);
    }
}
