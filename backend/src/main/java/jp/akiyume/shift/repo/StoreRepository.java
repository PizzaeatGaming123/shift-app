package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}
