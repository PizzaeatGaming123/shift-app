package jp.akiyume.shift.seed;

import jp.akiyume.shift.domain.Role;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DataSeederTest {

    @Autowired StoreRepository storeRepository;
    @Autowired StaffRepository staffRepository;

    @Test
    void seedsThreeStoresWithStaffAndOneManagerEach() {
        assertThat(storeRepository.findAll()).extracting("name")
                .contains("中島店", "新田店", "早島店");
        // 各店に最低1名の店長
        for (var store : storeRepository.findAll()) {
            assertThat(staffRepository.findByStoreId(store.getId()).size()).isGreaterThanOrEqualTo(5);
            long managers = staffRepository.findByStoreId(store.getId()).stream()
                    .filter(s -> s.getRole() == Role.MANAGER).count();
            assertThat(managers).isGreaterThanOrEqualTo(1);
        }
    }
}
