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
import java.util.ArrayList;
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
    public void assign(Long storeId, LocalDate date, String slotCode, Long staffId,
                       String startTime, String endTime, String changedBy) {
        // 既存の単純版を維持。タスク/休憩/メモは触らない。
        assign(storeId, date, slotCode, staffId, startTime, endTime, null, null, null, changedBy);
    }

    /**
     * 参考UI風モーダル用の拡張版。tasks / breaks / workMemo を同時に保存する。
     * セマンティクス:
     *   - tasks / breaks / workMemo に null が来たら「指定なし」= 既存値を維持する。
     *   - 空リスト/空文字列が来たら「明示的にクリア」= 全消し。
     * これは旧クライアント（時刻だけ送る toggleAssignment 経由）が既存のタスク/メモを
     * 意図せず吹き飛ばさないために重要。
     */
    @Transactional
    public void assign(Long storeId, LocalDate date, String slotCode, Long staffId,
                       String startTime, String endTime,
                       List<String> tasks, List<BreakInput> breaks, String workMemo,
                       String changedBy) {
        WorkSlot slot = WorkSlot.fromCode(slotCode);
        // 同じ (store, date, staff) で他の slot の割当が残っていたら削除する。
        // モーダルで早番→遅番（または逆）に切り替えたとき、古い slot の割当が
        // 二重に残ることを防ぐ。スタッフ1人=1日1コマの運用想定。
        for (WorkSlot other : WorkSlot.values()) {
            if (other == slot) continue;
            assignmentRepository
                    .findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, other, staffId)
                    .ifPresent(stale -> {
                        Store store = stale.getStore();
                        Staff staff = stale.getStaff();
                        assignmentRepository.delete(stale);
                        recordChangeIfApplicable(store, date, other, staff,
                                ShiftChangeHistory.Action.UNASSIGN, changedBy);
                    });
        }
        var existing = assignmentRepository.findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId);
        ShiftAssignment a;
        boolean isNew;
        if (existing.isPresent()) {
            a = existing.get();
            isNew = false;
        } else {
            Store store = storeRepository.findById(storeId).orElseThrow();
            Staff staff = staffRepository.findById(staffId).orElseThrow();
            a = new ShiftAssignment(store, date, slot, staff);
            isNew = true;
        }
        a.setStartTime(startTime);
        a.setEndTime(endTime);
        if (tasks != null) a.setTasks(joinTasks(tasks));
        if (workMemo != null) a.setWorkMemo(workMemo.isEmpty() ? null : workMemo);
        if (breaks != null) {
            List<ShiftAssignmentBreak> breakEntities = new ArrayList<>();
            for (BreakInput b : breaks) {
                if (b == null || b.startTime() == null || b.endTime() == null) continue;
                breakEntities.add(new ShiftAssignmentBreak(b.startTime(), b.endTime()));
            }
            a.replaceBreaks(breakEntities);
        }
        if (isNew) {
            assignmentRepository.save(a);
            recordChangeIfApplicable(a.getStore(), date, slot, a.getStaff(),
                    ShiftChangeHistory.Action.ASSIGN, changedBy);
        }
    }

    /** タスクリストをカンマ区切り文字列にまとめる。空ならnull。 */
    private String joinTasks(List<String> tasks) {
        if (tasks == null || tasks.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        for (String t : tasks) {
            if (t == null) continue;
            String trimmed = t.trim();
            if (trimmed.isEmpty()) continue;
            if (sb.length() > 0) sb.append(',');
            sb.append(trimmed);
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    /** 休憩時間の入力 DTO。Service が受け取る最小単位。 */
    public record BreakInput(String startTime, String endTime) {}

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
