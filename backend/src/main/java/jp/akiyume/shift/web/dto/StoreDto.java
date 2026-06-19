package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Store;

public record StoreDto(Long id, String name) {
    public static StoreDto from(Store store) {
        return new StoreDto(store.getId(), store.getName());
    }
}
