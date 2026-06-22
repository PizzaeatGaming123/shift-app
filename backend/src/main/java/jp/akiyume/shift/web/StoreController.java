package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import jp.akiyume.shift.repo.service.StaffService;
import jp.akiyume.shift.web.dto.CreateStaffBody;
import jp.akiyume.shift.web.dto.StaffDto;
import jp.akiyume.shift.web.dto.StoreDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;
    private final StaffService staffService;

    public StoreController(StoreRepository storeRepository, StaffRepository staffRepository,
                           StaffService staffService) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
        this.staffService = staffService;
    }

    @GetMapping
    public List<StoreDto> stores() {
        return storeRepository.findAll().stream().map(StoreDto::from).toList();
    }

    @GetMapping("/{storeId}/staff")
    public List<StaffDto> staff(@PathVariable Long storeId) {
        return staffRepository.findByStoreId(storeId).stream().map(StaffDto::from).toList();
    }

    @PostMapping("/{storeId}/staff")
    public StaffDto createStaff(@PathVariable Long storeId, @RequestBody CreateStaffBody body) {
        return StaffDto.from(staffService.create(storeId, body.name(), body.employmentType(), body.role()));
    }
}
