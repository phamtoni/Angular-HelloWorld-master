/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */
import {
    Component,
    ElementRef,
    OnInit,
    ViewChild
} from '@angular/core';
import {
    BreadcrumbService,
    NavItem,
    SidebarService
} from '@igpm/core';
import {ScrollDispatcherService} from "../shared/scroll-dispatcher/scroll-dispatcher.service";
import {environment} from "../../environments/environment";
import {Title} from "@angular/platform-browser";

@Component({
    selector: 'css-core',
    templateUrl: './core.component.html',
    styleUrls: ['./core.component.scss']
})
export class CoreComponent implements OnInit {
    @ViewChild('main') mainContainer: ElementRef;

    title: string;
    navItems: NavItem[] = [
        {id: 'project-overview', label: 'Project Overview', icon: 'Bosch-IC-components', url: '/project-overview'}
    ];

    sidebarFooterItems: NavItem[] = [];

    constructor(
        private breadcrumbs: BreadcrumbService,
        private sidebarService: SidebarService,
        private titleService: Title,
        private scrollDispatcher: ScrollDispatcherService
    ) {
        // set title follow environment
        this.title = 'iGPM CSS';
        const title = environment.environment === 'prod' ? this.title : '[' + environment.environment.toUpperCase() + '] ' + this.title;
        this.setTitle(title);
    }

    ngOnInit() {
        this.breadcrumbs.setStickyRootBreadcrumbs({url: '/', title: this.title});
        this.breadcrumbs.stickyRootBreadcrumb = true;
        this.sidebarService.sidebarState = false;
        this.scrollDispatcher.elementRef = this.mainContainer;
        let mainElem = this.mainContainer.nativeElement;

        // Subscribe to scroll event of main content.
        mainElem.addEventListener('scroll', (event) => {
            this.scrollDispatcher.dispatch(event);
        })
    }

    ngOnDestroy() {
        this.mainContainer.nativeElement.removeEventListener('scroll', (event) => {
        });
    }

    public setTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }

}
