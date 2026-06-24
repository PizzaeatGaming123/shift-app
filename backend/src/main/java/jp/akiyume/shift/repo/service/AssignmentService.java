package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.ShiftAssignmentRepository;
import jp.akiyume.shift.repo.ShiftChangeHistoryRepository;
import jp.akiyume.shift.repo.ShiftPlanRepository;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class AssignmentService {

    private final ShiftAssignmentRepository assignmentRepository;
    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;
    private final ShiftPlanRepository shiftPlanRepository;
    private final ShiftChangeHistoryRepository historyRepository;
    private final NotificationService notificationService;

    public AssignmentService(ShiftAssignmentRepository assignmentRepository,
                             StoreRepository storeRepository, StaffRepository staffRepository,
                             ShiftPlanRepository shiftPlanRepository,
                             ShiftChangeHistoryRepository historyRepository,
                             NotificationService notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
        this.shiftPlanRepository = shiftPlanRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public void assign(Long storeId, LocalDate date, String slotCode, Long staffId, String changedBy) {
        WorkSlot slot = WorkSlot.fromCode(slotCode);
        if (assignmentRepository.findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId).isPresent()) {
            return; // 冪等
        }
        Store store = storeRepository.findById(storeId).orElseThrow();
        Staff staff = staffRepository.findById(staffId).orElseThrow();
        assignmentRepository.save(new ShiftAssignment(store, date, slot, staff));
        recordChangeIfApplicable(store, date, slot, staff,
                ShiftChangeHistory.Action.ASSIGN, changedBy);
    }

    @Transactional
    public void unassign(Long storeId, LocalDate date, String slotCode, Long staffId, String changedBy) {
        WorkSlot slot = WorkSlot.fromCode(slotCode);
        assignmentRepository
                .findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId)
                .ifPresent(existing -> {
                    Store store = existing.getStore();
                    Staff staff = existing.getStaff();
                    assignmentRepository.delete(existing);
                    recordChangeIfApplicable(store, date, slot, staff,
                            ShiftChangeHistory.Action.UNASSIGN, changedBy);
                });
    }

    /** 計画が CONFIRMED 以上なら履歴を記録、PUBLISHED 以上なら本人へ通知。 */
    private void recordChangeIfApplicable(Store store, LocalDate date, WorkSlot slot, Staff staff,
                                          ShiftChangeHistory.Action action, String changedBy) {
        String month = String.format("%04d-%02d", date.getYear(), date.getMonthValue());
        var plan = shiftPlanRepository.findByStore_IdAndMonth(store.getId(), month).orElse(null);
        if (plan == null || !plan.getStatus().isConfirmedOrLater()) return;
        historyRepository.save(new ShiftChangeHistory(store, date, slot, staff,
                action, changedBy == null ? "system" : changedBy, null));
        if (plan.getStatus().isPublished()) {
            notificationService.create(staff, Notification.Kind.ASSIGNMENT_CHANGED,
                    String.format("%s のシフトが %s されました（%s）",
                            date, action == ShiftChangeHistory.Action.ASSIGN ? "追加" : "解除",
                            slot.getCode()));
        }
    }

    public List<ShiftAssignment> findByStoreAndMonth(Long storeId, LocalDate from, LocalDate to) {
        return assignmentRepository.findByStore_IdAndDateBetween(storeId, from, to);
    }
}
