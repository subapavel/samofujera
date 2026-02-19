package cz.samofujera.page.internal;

import cz.samofujera.page.PageService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class PageSchedulerJob {

    private final PageService pageService;

    PageSchedulerJob(PageService pageService) {
        this.pageService = pageService;
    }

    @Scheduled(fixedRate = 60_000)
    void publishScheduledPages() {
        pageService.publishDuePages();
    }
}
