package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftChangeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ShiftChangeHistoryRepository extends JpaRepository<ShiftChangeHistory, Long> {
    List<ShiftChangeHistory> findByStore_IdAndDateBetweenOrderByChangedAtDesc(
            Long storeId, LocalDate from, LocalDate to);
}
