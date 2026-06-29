package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftAssignment;
import jp.akiyume.shift.domain.WorkSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {
    List<ShiftAssignment> findByStore_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    Optional<ShiftAssignment> findByStore_IdAndDateAndSlotAndStaff_Id(
            Long storeId, LocalDate date, WorkSlot slot, Long staffId);
    /** 指定スタッフのその日の割当（早番/遅番どちらも）。希望「休み」連動の解除に使う。 */
    List<ShiftAssignment> findByStaff_IdAndDate(Long staffId, LocalDate date);

    /** 店舗・月（[from, to] の閉区間）の全割当を一括削除。確定解除フローで使用。 */
    void deleteByStore_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
}
