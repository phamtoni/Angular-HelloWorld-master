import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CoreComponent} from './core.component';
import {
    BreadcrumbComponent,
    BreadcrumbModule,
    BreadcrumbsComponent,
    BreadcrumbService,
    HeaderComponent,
    LayoutComponent,
    SidebarComponent,
    SidebarFooterComponent,
    SidebarItemComponent,
    SidebarService
} from "@igpm/core";
import {CoverageSpecialSalesMaterialModule} from "../shared/material";
import {Title} from "@angular/platform-browser";
import {ScrollDispatcherService} from "../shared/scroll-dispatcher";
import {RouterTestingModule} from "@angular/router/testing";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";

describe('CoreComponent', () => {
    let component: CoreComponent;
    let fixture: ComponentFixture<CoreComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                CoverageSpecialSalesMaterialModule,
                RouterTestingModule.withRoutes([]),
                NoopAnimationsModule
            ],
            declarations: [
                CoreComponent,
                SidebarComponent,
                HeaderComponent,
                LayoutComponent ,
                SidebarFooterComponent,
                SidebarItemComponent,
                BreadcrumbsComponent,
                BreadcrumbComponent
            ],
            providers: [BreadcrumbService,SidebarService,Title,ScrollDispatcherService]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CoreComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
