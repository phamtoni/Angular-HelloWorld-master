/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {async, ComponentFixture, inject, TestBed} from '@angular/core/testing';
import {ProjectNavigationComponent} from './project-navigation.component';
import {OverlayContainer} from "@angular/cdk/overlay";
import {Platform} from "@angular/cdk/platform";
import {MockProjectPlanningService} from "../../../../../mock/mock-services/mock-project-planning.service";
import {CommonModule} from "@angular/common";
import {ReactiveFormsModule} from "@angular/forms";
import {SharedModule} from "../../../../shared/shared.module";
import {MatSelectModule} from "@angular/material/select";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {BROWSER_LOCALE, BrowserLocaleModule} from "../../../../shared/locale/browser-locale";
import {MockDataService} from "../../../../../mock/mock-services/mockDataService.service";

describe('NavigationComponent', () => {
    let component: ProjectNavigationComponent;
    let fixture: ComponentFixture<ProjectNavigationComponent>;
    let nativeEl: HTMLElement;
    let browserLocale : string;

    let overlayContainer: OverlayContainer;
    let overlayContainerElement: HTMLElement;
    let platform: Platform;
    let mockData : MockProjectPlanningService;
    let mockDataService: MockDataService;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                ReactiveFormsModule,
                SharedModule,
                MatSelectModule,
                BrowserLocaleModule,
                NoopAnimationsModule
            ],
            declarations: [ ProjectNavigationComponent],
            providers: [MockProjectPlanningService, MockDataService]
        }).compileComponents().then();
        mockData = TestBed.get(MockProjectPlanningService);
        mockDataService = TestBed.get(MockDataService);

        inject([OverlayContainer, Platform], (oc: OverlayContainer, p: Platform) => {
            overlayContainer = oc;
            overlayContainerElement = oc.getContainerElement();
            platform = p;
        })();

        mockData = TestBed.get(MockProjectPlanningService);

        inject([BROWSER_LOCALE],token=> {
            browserLocale = token;
        });
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProjectNavigationComponent);
        component = fixture.componentInstance;
        component.projectNavigation = mockDataService.getProjectNavigation();
        component.subProjects = mockDataService.getProjectNavigation().subProjects;
        component.selectedItem = mockDataService.getProjectNavigation().subProjects[0];
        component.selectedItemIndex = -1;
        component.selectNavigation(1,1);
        nativeEl = fixture.nativeElement;
        fixture.detectChanges();
    });

    it('should have a tree node root', () => {
        const treeNodeRootElem = nativeEl.querySelector('.navigation-container .tree-node-root .node-content') as HTMLElement;
        expect(treeNodeRootElem.innerText).toEqual('PRJ');
    });

    it('should have children nodes', () => {
        const treeNodeRootElem = nativeEl.querySelector('.navigation-container .tree-node-container .node-content') as HTMLElement;
        expect(treeNodeRootElem.innerText).toEqual('_001');
    });

    it('should call onSaveClickedEvent', () => {
        const navigationItemSelected = spyOn(component.onNavigationItemSelected, 'emit').and.returnValue({});
        component.selectNavigation(mockDataService.getProjectNavigation(), -1);
        expect(navigationItemSelected).toHaveBeenCalledWith(mockDataService.getProjectNavigation())
    });
});
