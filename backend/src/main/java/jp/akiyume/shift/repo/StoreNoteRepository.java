package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.StoreNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StoreNoteRepository extends JpaRepository<StoreNote, Long> {
    List<StoreNote> findByStore_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    Optional<StoreNote> findByStore_IdAndDate(Long storeId, LocalDate date);
}
