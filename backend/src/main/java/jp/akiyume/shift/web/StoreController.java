package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import jp.akiyume.shift.web.dto.StaffDto;
import jp.akiyume.shift.web.dto.StoreDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;

    public StoreController(StoreRepository storeRepository, StaffRepository staffRepository) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
    }

    @GetMapping
    public List<StoreDto> stores() {
        return storeRepository.findAll().stream().map(StoreDto::from).toList();
    }

    @GetMapping("/{storeId}/staff")
    public List<StaffDto> staff(@PathVariable Long storeId) {
        return staffRepository.findByStoreId(storeId).stream().map(StaffDto::from).toList();
    }
}
