import { mergeClasses } from '@expo/styleguide';
import { breakpoints } from '@expo/styleguide-base';
import { useRouter } from 'next/compat/router';
import { useEffect, useState, createRef, type PropsWithChildren, useRef } from 'react';

import { InlineHelp } from 'ui/components/InlineHelp';
import { PageHeader } from 'ui/components/PageHeader';
import * as RoutesUtils from '~/common/routes';
import { appendSectionToRoute, isRouteActive } from '~/common/routes';
import { versionToText } from '~/common/utilities';
import * as WindowUtils from '~/common/window';
import DocumentationHead from '~/components/DocumentationHead';
import DocumentationNestedScrollLayout from '~/components/DocumentationNestedScrollLayout';
import { usePageApiVersion } from '~/providers/page-api-version';
import versions from '~/public/static/constants/versions.json';
import { PageMetadata } from '~/types/common';
import { Footer } from '~/ui/components/Footer';
import { Header } from '~/ui/components/Header';
import { Separator } from '~/ui/components/Separator';
import { Sidebar } from '~/ui/components/Sidebar/Sidebar';
import {
  TableOfContentsWithManager,
  TableOfContentsHandles,
} from '~/ui/components/TableOfContents';
import { A } from '~/ui/components/Text';

const { LATEST_VERSION } = versions;

export type DocPageProps = PropsWithChildren<PageMetadata>;

export default function DocumentationPage({
  title,
  description,
  packageName,
  sourceCodeUrl,
  iconUrl,
  children,
  hideFromSearch,
  platforms,
  hideTOC,
  modificationDate,
  searchRank,
  searchPosition,
}: DocPageProps) {
  const [isMobileMenuVisible, setMobileMenuVisible] = useState(false);
  const { version } = usePageApiVersion();
  const router = useRouter();

  const layoutRef = createRef<DocumentationNestedScrollLayout>();
  const tableOfContentsRef = useRef<TableOfContentsHandles>(null);

  const pathname = router?.pathname ?? '/';
  const routes = RoutesUtils.getRoutes(pathname, version);
  const sidebarActiveGroup = RoutesUtils.getPageSection(pathname);
  const sidebarScrollPosition = process?.browser ? window.__sidebarScroll : 0;

  useEffect(() => {
    if (layoutRef.current) {
      layoutRef.current.contentRef.current?.getScrollRef().current?.focus();
      router?.events.on('routeChangeStart', url => {
        if (
          RoutesUtils.getPageSection(pathname) !== RoutesUtils.getPageSection(url) ||
          pathname === '/' ||
          !layoutRef.current
        ) {
          window.__sidebarScroll = 0;
        } else {
          window.__sidebarScroll = layoutRef.current.getSidebarScrollTop();
        }
      });
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [layoutRef.current, tableOfContentsRef.current]);

  const handleResize = () => {
    if (WindowUtils.getViewportSize().width >= breakpoints.medium + 124) {
      setMobileMenuVisible(false);
      window.scrollTo(0, 0);
    }
  };

  const handleContentScroll = (contentScrollPosition: number) => {
    window.requestAnimationFrame(() => {
      if (tableOfContentsRef.current?.handleContentScroll) {
        tableOfContentsRef.current.handleContentScroll(contentScrollPosition);
      }
    });
  };

  const sidebarElement = <Sidebar routes={routes} />;
  const tocElement = <TableOfContentsWithManager ref={tableOfContentsRef} />;
  const headerElement = (
    <Header
      sidebar={sidebarElement}
      sidebarActiveGroup={sidebarActiveGroup}
      isMobileMenuVisible={isMobileMenuVisible}
      setMobileMenuVisible={newState => {
        setMobileMenuVisible(newState);
      }}
    />
  );

  const flattenStructure = routes
    .map(route => appendSectionToRoute(route))
    .flat()
    .map(route => (route?.type === 'page' ? route : appendSectionToRoute(route)))
    .flat();

  const pageIndex = flattenStructure.findIndex(page =>
    isRouteActive(page, router?.asPath, router?.pathname)
  );

  const previousPage = flattenStructure[pageIndex - 1];
  const nextPage = flattenStructure[pageIndex + 1];

  return (
    <DocumentationNestedScrollLayout
      ref={layoutRef}
      header={headerElement}
      sidebar={sidebarElement}
      sidebarRight={tocElement}
      sidebarActiveGroup={sidebarActiveGroup}
      hideTOC={hideTOC ?? false}
      isMobileMenuVisible={isMobileMenuVisible}
      onContentScroll={handleContentScroll}
      sidebarScrollPosition={sidebarScrollPosition}>
      <DocumentationHead
        title={title}
        description={description}
        canonicalUrl={
          version !== 'unversioned' ? RoutesUtils.getCanonicalUrl(pathname) : undefined
        }>
        {hideFromSearch !== true && (
          <meta
            name="docsearch:version"
            content={RoutesUtils.isReferencePath(pathname) ? version : 'none'}
          />
        )}
        {(version === 'unversioned' ||
          RoutesUtils.isPreviewPath(pathname) ||
          RoutesUtils.isArchivePath(pathname)) && <meta name="robots" content="noindex" />}
        {searchRank && <meta name="searchRank" content={String(searchRank)} />}
        {searchPosition && <meta name="searchPosition" content={String(searchPosition)} />}
      </DocumentationHead>
      <div
        className={mergeClasses(
          'pointer-events-none absolute z-10 h-8 w-[calc(100%-6px)] max-w-screen-xl',
          'bg-gradient-to-b from-default to-transparent opacity-90'
        )}
      />
      <main
        className={mergeClasses('mx-auto px-14 pt-10', 'max-lg-gutters:px-4 max-lg-gutters:pt-5')}>
        {version && version === 'unversioned' && (
          <InlineHelp type="default" size="sm" className="!mb-5 !inline-flex w-full">
            This is documentation for the next SDK version. For up-to-date documentation, see the{' '}
            <A href={pathname.replace('unversioned', 'latest')}>latest version</A> (
            {versionToText(LATEST_VERSION)}).
          </InlineHelp>
        )}
        {title && (
          <PageHeader
            title={title}
            description={description}
            sourceCodeUrl={sourceCodeUrl}
            packageName={packageName}
            iconUrl={iconUrl}
            platforms={platforms}
          />
        )}
        {title && <Separator />}
        {children}
      </main>
      <Footer
        title={title}
        sourceCodeUrl={sourceCodeUrl}
        packageName={packageName}
        previousPage={previousPage}
        nextPage={nextPage}
        modificationDate={modificationDate}
      />
    </DocumentationNestedScrollLayout>
  );
}
