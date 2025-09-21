package org.lowcoder.domain.organization.service;

import org.apache.commons.lang3.RandomUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.lowcoder.domain.organization.model.MemberRole;
import org.lowcoder.domain.organization.model.OrgMember;
import org.lowcoder.domain.plugin.service.DatasourceMetaInfoService;
import org.lowcoder.sdk.util.IDUtils;
import org.pf4j.PluginManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@SpringBootTest
@ExtendWith(SpringExtension.class)
public class OrgMemberServiceTest {

    @MockitoBean
    private PluginManager pluginManager;

    @MockitoBean
    private JavaMailSender javaMailSender;

    @Autowired
    private OrgMemberService orgMemberService;

    @Test
    public void testGetAllOrganizationMembers() {
        int totalCount = RandomUtils.nextInt(100, 500);
        String orgId = IDUtils.generate();
        Set<String> userIds = IntStream.rangeClosed(1, totalCount).mapToObj(i -> IDUtils.generate()).collect(Collectors.toSet());
        Mono<List<String>> listMono = orgMemberService.bulkAddMember(orgId, userIds, MemberRole.MEMBER)
                .thenMany(orgMemberService.getOrganizationMembers(orgId))
                .map(OrgMember::getUserId)
                .collectList();

        StepVerifier.create(listMono)
                .assertNext(list -> {
                    Assertions.assertEquals(totalCount, list.size());
                    Assertions.assertEquals(userIds, new HashSet<>(list));
                })
                .verifyComplete();
    }
}